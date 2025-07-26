const fs = require('fs');
const path = require('path');
const Database = require('../config/database');

async function initDatabase() {
  try {
    console.log('開始初始化數據庫...');
    
    // 讀取 SQL 初始化腳本
    const sqlPath = path.join(__dirname, '../database.sql');
    const sqlScript = fs.readFileSync(sqlPath, 'utf8');
    
    // 分割 SQL 語句並執行
    const statements = sqlScript
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    for (const statement of statements) {
      if (statement.trim()) {
        await Database.run(statement);
        console.log('執行 SQL:', statement.substring(0, 50) + '...');
      }
    }
    
    console.log('數據庫初始化完成！');
    
    // 驗證數據
    const products = await Database.all('SELECT COUNT(*) as count FROM products');
    const flavors = await Database.all('SELECT COUNT(*) as count FROM flavors');
    const announcements = await Database.all('SELECT COUNT(*) as count FROM announcements');

    // 檢查設置表
    let settings = [];
    try {
      settings = await Database.all('SELECT COUNT(*) as count FROM site_settings');
    } catch (error) {
      console.log('⚠️  設置表不存在，將在下次初始化時創建');
      settings = [{ count: 0 }];
    }

    console.log(`數據統計:`);
    console.log(`- 產品數量: ${products[0].count}`);
    console.log(`- 口味數量: ${flavors[0].count}`);
    console.log(`- 公告數量: ${announcements[0].count}`);
    console.log(`- 設置數量: ${settings[0].count}`);
    
  } catch (error) {
    console.error('數據庫初始化失敗:', error);
  }
}

// 如果直接運行此腳本，則初始化數據庫
if (require.main === module) {
  initDatabase().then(() => {
    process.exit(0);
  }).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = initDatabase;
