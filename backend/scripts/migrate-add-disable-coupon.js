const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

async function migrateAddDisableCoupon() {
  console.log('🔄 開始遷移：添加產品禁止優惠券功能...');

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
    console.log('📋 檢查 products 表結構...');
    
    const productsColumns = await dbAll(`PRAGMA table_info(products)`);
    const columnNames = productsColumns.map(col => col.name);
    
    console.log('📊 現有欄位:', columnNames);
    
    if (!columnNames.includes('disable_coupon')) {
      console.log('🆕 添加 disable_coupon 欄位...');
      await dbRun('ALTER TABLE products ADD COLUMN disable_coupon INTEGER DEFAULT 0');
      console.log('✅ disable_coupon 欄位添加完成');
    } else {
      console.log('✅ disable_coupon 欄位已存在');
    }
    
    const finalCheck = await dbGet('SELECT COUNT(*) as count FROM products');
    console.log(`📈 產品總數: ${finalCheck.count} 個`);
    console.log('🎉 禁止優惠券功能遷移完成！');
    
  } catch (error) {
    console.error('❌ 遷移失敗:', error);
    throw error;
  } finally {
    db.close((err) => {
      if (err) {
        console.error('❌ 關閉數據庫失敗:', err.message);
      } else {
        console.log('✅ 數據庫連接已關閉');
      }
    });
  }
}

if (require.main === module) {
  migrateAddDisableCoupon()
    .then(() => {
      console.log('✅ 遷移完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 遷移失敗:', error);
      process.exit(1);
    });
}

module.exports = migrateAddDisableCoupon;