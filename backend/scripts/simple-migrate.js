const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

async function simpleMigrate() {
  console.log('🔄 開始簡單遷移...');
  
  // 創建獨立的數據庫連接
  const dbDir = process.env.NODE_ENV === 'production' ? '/app/data' : path.join(__dirname, '../data');
  const dbPath = path.join(dbDir, 'mistmall.db');
  
  console.log('📄 使用數據庫路徑:', dbPath);
  
  if (!fs.existsSync(dbPath)) {
    console.log('❌ 數據庫文件不存在，跳過遷移');
    return;
  }
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, async (err) => {
      if (err) {
        console.error('❌ 連接數據庫失敗:', err.message);
        reject(err);
        return;
      }
      
      console.log('✅ 遷移腳本成功連接到數據庫');
      
      try {
        // 1. 檢查並創建 upsell_products 表
        console.log('📋 檢查 upsell_products 表...');
        
        db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='upsell_products'`, (err, row) => {
          if (err) {
            console.error('❌ 檢查表失敗:', err.message);
            db.close();
            reject(err);
            return;
          }
          
          if (!row) {
            console.log('🆕 創建 upsell_products 表...');
            db.run(`
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
            `, (err) => {
              if (err) {
                console.error('❌ 創建表失敗:', err.message);
                db.close();
                reject(err);
                return;
              }
              
              console.log('✅ upsell_products 表創建完成');
              
              // 插入範例數據
              const upsellProducts = [
                ['精選咖啡包組合', '精選多種口味咖啡包，適合搭配購買', 99, 50],
                ['保溫杯', '高品質保溫杯，保溫效果佳', 199, 30],
                ['茶葉禮盒', '精美包裝茶葉禮盒', 299, 20],
                ['手工餅乾', '新鮮製作手工餅乾', 149, 40]
              ];
              
              let insertCount = 0;
              upsellProducts.forEach(([name, description, price, stock]) => {
                db.run(`
                  INSERT OR IGNORE INTO upsell_products (name, description, price, stock, images)
                  VALUES (?, ?, ?, ?, ?)
                `, [name, description, price, stock, '[]'], (err) => {
                  if (err) {
                    console.error('❌ 插入數據失敗:', err.message);
                  }
                  insertCount++;
                  if (insertCount === upsellProducts.length) {
                    console.log('✅ 範例加購商品插入完成');
                    checkSiteSettings();
                  }
                });
              });
            });
          } else {
            console.log('✅ upsell_products 表已存在');
            checkSiteSettings();
          }
        });
        
        function checkSiteSettings() {
          // 2. 檢查並創建 site_settings 表
          console.log('📋 檢查 site_settings 表...');
          
          db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='site_settings'`, (err, row) => {
            if (err) {
              console.error('❌ 檢查設置表失敗:', err.message);
              db.close();
              reject(err);
              return;
            }
            
            if (!row) {
              console.log('🆕 創建 site_settings 表...');
              db.run(`
                CREATE TABLE site_settings (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  \`key\` TEXT UNIQUE NOT NULL,
                  value TEXT,
                  description TEXT,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
              `, (err) => {
                if (err) {
                  console.error('❌ 創建設置表失敗:', err.message);
                  db.close();
                  reject(err);
                  return;
                }
                
                console.log('✅ site_settings 表創建完成');
                
                // 插入基本設置
                const settings = [
                  ['homepage_subtitle', '精選優質茶葉、咖啡豆與手工餅乾，為您帶來最美好的味覺體驗', '首頁副標題'],
                  ['contact_telegram', 't.me/whalesale', 'Telegram 客服連結'],
                  ['free_shipping_threshold', '3000', '免運費門檻'],
                  ['store_notice', '本賣場3000免運優惠中 當天出貨', '商店公告']
                ];
                
                let settingCount = 0;
                settings.forEach(([key, value, description]) => {
                  db.run(`
                    INSERT OR REPLACE INTO site_settings (\`key\`, value, description, updated_at)
                    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                  `, [key, value, description], (err) => {
                    if (err) {
                      console.error('❌ 插入設置失敗:', err.message);
                    }
                    settingCount++;
                    if (settingCount === settings.length) {
                      console.log('✅ 基本設置插入完成');
                      finishMigration();
                    }
                  });
                });
              });
            } else {
              console.log('✅ site_settings 表已存在');
              finishMigration();
            }
          });
        }
        
        function finishMigration() {
          console.log('🎉 簡單遷移完成！');
          db.close((err) => {
            if (err) {
              console.error('❌ 關閉數據庫失敗:', err.message);
              reject(err);
            } else {
              console.log('✅ 數據庫連接已關閉');
              resolve();
            }
          });
        }
        
      } catch (error) {
        console.error('❌ 遷移過程失敗:', error);
        db.close();
        reject(error);
      }
    });
  });
}

// 如果直接運行此腳本
if (require.main === module) {
  simpleMigrate()
    .then(() => {
      console.log('✅ 簡單遷移完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 簡單遷移失敗:', error);
      process.exit(1);
    });
}

module.exports = simpleMigrate;
