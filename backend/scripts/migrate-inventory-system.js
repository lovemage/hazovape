const Database = require('../config/database');

async function migrateInventorySystem() {
  try {
    console.log('開始遷移庫存系統...');

    // 禁用外鍵約束
    await Database.run('PRAGMA foreign_keys = OFF');

    // 1. 移除products表的stock字段
    console.log('1. 移除商品表的庫存字段...');

    // 清理可能存在的臨時表
    try {
      await Database.run('DROP TABLE IF EXISTS products_new');
    } catch (e) {
      // 忽略錯誤
    }

    // 創建新的products表結構（不包含stock）
    await Database.run(`
      CREATE TABLE products_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        multi_discount TEXT,
        images TEXT,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 複製數據（排除stock字段）
    await Database.run(`
      INSERT INTO products_new (id, name, price, multi_discount, images, is_active, created_at, updated_at)
      SELECT id, name, price, multi_discount, images, is_active, created_at, updated_at
      FROM products
    `);

    // 刪除舊表，重命名新表
    await Database.run('DROP TABLE products');
    await Database.run('ALTER TABLE products_new RENAME TO products');
    
    console.log('✅ 商品表庫存字段已移除');
    
    // 2. 確保flavors表有stock字段並添加庫存數據
    console.log('2. 更新口味表庫存數據...');
    
    // 檢查flavors表是否已有stock字段
    const tableInfo = await Database.all("PRAGMA table_info(flavors)");
    const hasStockField = tableInfo.some(column => column.name === 'stock');
    
    if (!hasStockField) {
      // 添加stock字段
      await Database.run('ALTER TABLE flavors ADD COLUMN stock INTEGER DEFAULT 0');
      console.log('✅ 為口味表添加了庫存字段');
    }
    
    // 為所有現有口味設置初始庫存
    await Database.run(`
      UPDATE flavors 
      SET stock = 100 
      WHERE stock = 0 OR stock IS NULL
    `);
    
    console.log('✅ 已為所有口味設置初始庫存（100件）');
    
    // 3. 驗證遷移結果
    console.log('3. 驗證遷移結果...');
    
    const products = await Database.all('SELECT * FROM products LIMIT 1');
    const flavors = await Database.all('SELECT * FROM flavors LIMIT 3');
    
    console.log('商品表結構（無庫存字段）:');
    if (products.length > 0) {
      console.log('字段:', Object.keys(products[0]));
    }
    
    console.log('口味表結構（含庫存字段）:');
    if (flavors.length > 0) {
      console.log('字段:', Object.keys(flavors[0]));
      console.log('示例口味庫存:');
      flavors.forEach(flavor => {
        console.log(`- ${flavor.name}: ${flavor.stock} 件`);
      });
    }
    
    console.log('✅ 庫存系統遷移完成！');
    console.log('');
    console.log('新的庫存邏輯：');
    console.log('- 商品：只管理商品信息，無庫存概念');
    console.log('- 口味：管理庫存，所有商品共享口味庫存池');
    console.log('- 訂單：下單時扣減對應口味的庫存');

    // 重新啟用外鍵約束
    await Database.run('PRAGMA foreign_keys = ON');

  } catch (error) {
    console.error('庫存系統遷移失敗:', error);
    // 確保重新啟用外鍵約束
    try {
      await Database.run('PRAGMA foreign_keys = ON');
    } catch (e) {
      console.error('重新啟用外鍵約束失敗:', e);
    }
    throw error;
  }
}

// 如果直接運行此腳本
if (require.main === module) {
  migrateInventorySystem().then(() => {
    console.log('遷移腳本執行完成');
    process.exit(0);
  }).catch(err => {
    console.error('遷移腳本執行失敗:', err);
    process.exit(1);
  });
}

module.exports = migrateInventorySystem;
