const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

async function migrateAddUpsellFeatures() {
  console.log('🔄 開始遷移：添加加購商品功能...');

  // 創建獨立的數據庫連接
  const dbDir = process.env.NODE_ENV === 'production' ? '/app/data' : path.join(__dirname, '../data');
  const dbPath = path.join(dbDir, 'mistmall.db');

  console.log('📄 使用數據庫路徑:', dbPath);

  if (!fs.existsSync(dbPath)) {
    console.log('❌ 數據庫文件不存在，跳過遷移');
    return;
  }

  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ 連接數據庫失敗:', err.message);
      throw err;
    } else {
      console.log('✅ 遷移腳本成功連接到數據庫');
    }
  });

  // 包裝數據庫操作
  const dbGet = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  };

  const dbRun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  };

  const dbAll = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  };

  try {
    // 1. 檢查並創建 upsell_products 表
    console.log('📋 檢查 upsell_products 表...');

    const upsellTableExists = await dbGet(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='upsell_products'
    `);
    
    if (!upsellTableExists) {
      console.log('🆕 創建 upsell_products 表...');
      await dbRun(`
        CREATE TABLE upsell_products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          price REAL NOT NULL,
          stock INTEGER DEFAULT 0,
          images TEXT,
          is_active INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ upsell_products 表創建完成');
      
      // 插入範例加購商品
      console.log('📝 插入範例加購商品...');
      const upsellProducts = [
        ['精選咖啡包組合', '精選多種口味咖啡包，適合搭配購買', 99, 50],
        ['保溫杯', '高品質保溫杯，保溫效果佳', 199, 30],
        ['茶葉禮盒', '精美包裝茶葉禮盒', 299, 20],
        ['手工餅乾', '新鮮製作手工餅乾', 149, 40]
      ];
      
      for (const [name, description, price, stock] of upsellProducts) {
        await dbRun(`
          INSERT INTO upsell_products (name, description, price, stock, images)
          VALUES (?, ?, ?, ?, ?)
        `, [name, description, price, stock, '[]']);
      }
      console.log('✅ 範例加購商品插入完成');
    } else {
      console.log('✅ upsell_products 表已存在');
    }
    
    // 2. 檢查並添加 order_items 表的新字段
    console.log('📋 檢查 order_items 表結構...');
    
    const orderItemsColumns = await Database.all(`PRAGMA table_info(order_items)`);
    const columnNames = orderItemsColumns.map(col => col.name);
    
    console.log('📊 現有字段:', columnNames);
    
    // 檢查並添加 upsell_product_id 字段
    if (!columnNames.includes('upsell_product_id')) {
      console.log('🆕 添加 upsell_product_id 字段...');
      await Database.run('ALTER TABLE order_items ADD COLUMN upsell_product_id INTEGER');
      console.log('✅ upsell_product_id 字段添加完成');
    } else {
      console.log('✅ upsell_product_id 字段已存在');
    }
    
    // 檢查並添加 is_upsell 字段
    if (!columnNames.includes('is_upsell')) {
      console.log('🆕 添加 is_upsell 字段...');
      await Database.run('ALTER TABLE order_items ADD COLUMN is_upsell INTEGER DEFAULT 0');
      console.log('✅ is_upsell 字段添加完成');
    } else {
      console.log('✅ is_upsell 字段已存在');
    }
    
    // 3. 檢查 product_id 字段的 NOT NULL 約束
    console.log('📋 檢查 product_id 字段約束...');
    
    const orderItemsSchema = await Database.get(`
      SELECT sql FROM sqlite_master 
      WHERE type='table' AND name='order_items'
    `);
    
    if (orderItemsSchema && orderItemsSchema.sql.includes('product_id INTEGER NOT NULL')) {
      console.log('⚠️  需要移除 product_id 的 NOT NULL 約束...');
      
      // 備份現有數據
      const existingData = await Database.all('SELECT * FROM order_items');
      console.log(`📦 備份 ${existingData.length} 條訂單項目數據`);
      
      // 創建新表結構
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
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
        )
      `);
      
      // 遷移數據
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
        console.log('✅ 數據遷移完成');
      }
      
      // 替換表
      await Database.run('DROP TABLE order_items');
      await Database.run('ALTER TABLE order_items_new RENAME TO order_items');
      console.log('✅ 表結構更新完成');
    } else {
      console.log('✅ product_id 字段約束已正確');
    }
    
    // 4. 檢查並創建 site_settings 表（如果不存在）
    console.log('📋 檢查 site_settings 表...');
    
    const settingsTableExists = await Database.get(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='site_settings'
    `);
    
    if (!settingsTableExists) {
      console.log('🆕 創建 site_settings 表...');
      await Database.run(`
        CREATE TABLE site_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT UNIQUE NOT NULL,
          value TEXT,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // 插入基本設置
      const settings = [
        ['homepage_subtitle', '精選優質茶葉、咖啡豆與手工餅乾，為您帶來最美好的味覺體驗', '首頁副標題'],
        ['contact_telegram', 't.me/whalesale', 'Telegram 客服連結'],
        ['free_shipping_threshold', '3000', '免運費門檻'],
        ['store_notice', '本賣場3000免運優惠中 當天出貨 訂購成功逾30分無法修改及取消訂單。 超商貨到付款機制配送時效1-3日。 請勿棄單或惡作劇下單(避免浪費彼此時間)。 配送狀態可以後台自行查詢配送狀態。 有相關問題請加飛機telegram( @whalesale ) 如遇口味缺貨，已有選擇的口味遞補！ 無售後無保固下單即同意', '商店公告']
      ];
      
      for (const [key, value, description] of settings) {
        await Database.run(`
          INSERT INTO site_settings (key, value, description, updated_at)
          VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        `, [key, value, description]);
      }
      console.log('✅ site_settings 表和基本設置創建完成');
    } else {
      console.log('✅ site_settings 表已存在');
    }
    
    // 5. 最終檢查
    console.log('📊 遷移完成，檢查結果...');
    
    const finalCheck = {
      upsell_products: await Database.get('SELECT COUNT(*) as count FROM upsell_products'),
      orders: await Database.get('SELECT COUNT(*) as count FROM orders'),
      order_items: await Database.get('SELECT COUNT(*) as count FROM order_items'),
      products: await Database.get('SELECT COUNT(*) as count FROM products')
    };
    
    console.log('📈 數據統計:');
    console.log(`   加購商品: ${finalCheck.upsell_products.count} 個`);
    console.log(`   訂單: ${finalCheck.orders.count} 個`);
    console.log(`   訂單項目: ${finalCheck.order_items.count} 個`);
    console.log(`   商品: ${finalCheck.products.count} 個`);
    
    console.log('🎉 加購商品功能遷移完成！');
    
  } catch (error) {
    console.error('❌ 遷移失敗:', error);
    throw error;
  }
}

// 如果直接運行此腳本
if (require.main === module) {
  migrateAddUpsellFeatures()
    .then(() => {
      console.log('✅ 遷移完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 遷移失敗:', error);
      process.exit(1);
    });
}

module.exports = migrateAddUpsellFeatures;
