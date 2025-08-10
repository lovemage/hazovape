const fs = require('fs').promises;
const path = require('path');
const Database = require('../config/database');

async function import711Stores() {
  try {
    console.log('🏪 開始導入7-11門市資料...');
    
    // 讀取GitHub上的資料
    const dataPath = path.join(__dirname, '../temp-cvs-data/src/assets/json/s_data.json');
    
    try {
      const rawData = await fs.readFile(dataPath, 'utf8');
      const stores = JSON.parse(rawData);
      
      console.log(`找到 ${stores.length} 個門市資料`);
      
      // 建立門市表格
      await Database.run(`
        CREATE TABLE IF NOT EXISTS stores (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          tel TEXT,
          address TEXT NOT NULL,
          lat REAL NOT NULL,
          lng REAL NOT NULL,
          city TEXT NOT NULL,
          area TEXT NOT NULL,
          service TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      console.log('✅ 門市表格已建立');
      
      // 清空現有資料
      await Database.run('DELETE FROM stores');
      console.log('🗑️ 已清空舊資料');
      
      // 使用 Database.run 批量插入資料
      let insertedCount = 0;
      
      for (const store of stores) {
        try {
          const serviceJson = store.service ? JSON.stringify(store.service) : '[]';
          
          await Database.run(`
            INSERT OR REPLACE INTO stores (id, name, tel, address, lat, lng, city, area, service)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            store.id,
            store.name,
            store.tel || '',
            store.address,
            store.lat,
            store.lng,
            store.city,
            store.area,
            serviceJson
          ]);
          
          insertedCount++;
          
          if (insertedCount % 1000 === 0) {
            console.log(`已導入 ${insertedCount} 個門市...`);
          }
        } catch (error) {
          console.error(`導入門市 ${store.id} 時發生錯誤:`, error.message);
        }
      }
      
      // 驗證導入結果
      const totalCount = await Database.get('SELECT COUNT(*) as count FROM stores');
      console.log(`✅ 成功導入 ${insertedCount} 個門市資料`);
      console.log(`📊 資料庫中總共有 ${totalCount.count} 個門市`);
      
      // 顯示一些樣本資料
      const samples = await Database.all('SELECT id, name, city, area FROM stores LIMIT 5');
      console.log('📝 樣本資料:');
      samples.forEach(store => {
        console.log(`  - ${store.name} (${store.id}) - ${store.city}${store.area}`);
      });
      
    } catch (fileError) {
      if (fileError.code === 'ENOENT') {
        console.error('❌ 找不到門市資料檔案:', dataPath);
        
        // 先創建空的stores表，避免API錯誤
        await Database.run(`
          CREATE TABLE IF NOT EXISTS stores (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            tel TEXT,
            address TEXT NOT NULL,
            lat REAL NOT NULL,
            lng REAL NOT NULL,
            city TEXT NOT NULL,
            area TEXT NOT NULL,
            service TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log('✅ 已創建空的stores表，門市功能將無法使用但不會影響系統運行');
        
        console.log('💡 如需門市功能，請聯繫系統管理員補充門市資料');
      } else {
        console.error('❌ 讀取門市資料檔案時發生錯誤:', fileError.message);
      }
      // 不再拋出錯誤，允許系統繼續運行
      console.log('⚠️ 門市資料導入失敗，但系統將繼續運行');
    }
    
  } catch (error) {
    console.error('❌ 導入門市資料時發生錯誤:', error.message);
    
    // 確保stores表至少存在，即使沒有資料
    try {
      await Database.run(`
        CREATE TABLE IF NOT EXISTS stores (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          tel TEXT,
          address TEXT NOT NULL,
          lat REAL NOT NULL,
          lng REAL NOT NULL,
          city TEXT NOT NULL,
          area TEXT NOT NULL,
          service TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ 已確保stores表存在');
    } catch (tableError) {
      console.error('❌ 無法創建stores表:', tableError.message);
    }
    
    // 不再拋出錯誤，允許系統繼續運行
    console.log('⚠️ 門市功能初始化失敗，但系統將繼續運行');
  }
}

// 如果直接執行此檔案
if (require.main === module) {
  import711Stores()
    .then(() => {
      console.log('🎉 門市資料導入完成！');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 門市資料導入失敗:', error.message);
      process.exit(1);
    });
}

module.exports = { import711Stores };