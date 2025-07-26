const Database = require('../config/database');

async function fixOrderItemsConstraints() {
  console.log('🔧 開始修復 order_items 表約束...');
  
  try {
    // 檢查當前表結構
    console.log('📋 檢查當前 order_items 表結構...');
    const tableInfo = await Database.all("PRAGMA table_info(order_items)");
    console.log('📊 當前表結構:', tableInfo);
    
    // 檢查是否已經有 upsell_product_id 和 is_upsell 字段
    const hasUpsellProductId = tableInfo.some(col => col.name === 'upsell_product_id');
    const hasIsUpsell = tableInfo.some(col => col.name === 'is_upsell');
    
    if (!hasUpsellProductId || !hasIsUpsell) {
      console.log('🔄 需要添加加購商品相關字段...');
      
      if (!hasUpsellProductId) {
        await Database.run('ALTER TABLE order_items ADD COLUMN upsell_product_id INTEGER');
        console.log('✅ 添加 upsell_product_id 字段');
      }
      
      if (!hasIsUpsell) {
        await Database.run('ALTER TABLE order_items ADD COLUMN is_upsell INTEGER DEFAULT 0');
        console.log('✅ 添加 is_upsell 字段');
      }
    }
    
    // 由於 SQLite 不支持直接修改列約束，我們需要重建表
    console.log('🔄 重建 order_items 表以移除 product_id 的 NOT NULL 約束...');
    
    // 1. 創建新表
    await Database.run(`
      CREATE TABLE order_items_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_id INTEGER,
        upsell_product_id INTEGER,
        product_name TEXT NOT NULL,
        product_price REAL NOT NULL,
        quantity INTEGER NOT NULL,
        flavors TEXT,
        subtotal REAL NOT NULL,
        is_upsell INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (upsell_product_id) REFERENCES upsell_products(id)
      )
    `);
    console.log('✅ 創建新表 order_items_new');
    
    // 2. 複製現有數據
    const existingData = await Database.all('SELECT * FROM order_items');
    console.log(`📦 找到 ${existingData.length} 條現有訂單項目數據`);
    
    if (existingData.length > 0) {
      for (const item of existingData) {
        await Database.run(`
          INSERT INTO order_items_new (
            id, order_id, product_id, upsell_product_id, product_name, 
            product_price, quantity, flavors, subtotal, is_upsell, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          item.id,
          item.order_id,
          item.product_id,
          item.upsell_product_id || null,
          item.product_name,
          item.product_price,
          item.quantity,
          item.flavors,
          item.subtotal,
          item.is_upsell || 0,
          item.created_at
        ]);
      }
      console.log('✅ 數據複製完成');
    }
    
    // 3. 刪除舊表
    await Database.run('DROP TABLE order_items');
    console.log('✅ 刪除舊表');
    
    // 4. 重命名新表
    await Database.run('ALTER TABLE order_items_new RENAME TO order_items');
    console.log('✅ 重命名新表');
    
    // 5. 驗證新表結構
    const newTableInfo = await Database.all("PRAGMA table_info(order_items)");
    console.log('📊 新表結構:', newTableInfo);
    
    console.log('🎉 order_items 表約束修復完成！');
    
  } catch (error) {
    console.error('❌ 修復失敗:', error);
    throw error;
  }
}

// 如果直接運行此腳本
if (require.main === module) {
  fixOrderItemsConstraints()
    .then(() => {
      console.log('✅ 修復完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 修復失敗:', error);
      process.exit(1);
    });
}

module.exports = fixOrderItemsConstraints;
