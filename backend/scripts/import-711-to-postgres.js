const fs = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');

async function import711StoresToPostgres() {
  let pool;
  
  try {
    console.log('🏪 開始導入7-11門市資料到 PostgreSQL...');
    
    // 連接到 PostgreSQL
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes('postgresql') ? { rejectUnauthorized: false } : false
    });
    
    // 讀取門市資料
    const dataPath = path.join(__dirname, '../temp-cvs-data/src/assets/json/s_data.json');
    const rawData = await fs.readFile(dataPath, 'utf8');
    const stores = JSON.parse(rawData);
    
    console.log(`找到 ${stores.length} 個門市資料`);
    
    // 創建表格（如果不存在）
    await pool.query(`
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ 門市表格已確認存在');
    
    // 清空現有資料
    await pool.query('DELETE FROM stores');
    console.log('🗑️ 已清空舊資料');
    
    // 批量插入資料
    let insertedCount = 0;
    const batchSize = 100;
    
    for (let i = 0; i < stores.length; i += batchSize) {
      const batch = stores.slice(i, i + batchSize);
      
      // 準備批量插入的值
      const values = [];
      const placeholders = [];
      let paramCount = 0;
      
      for (const store of batch) {
        const serviceJson = store.service ? JSON.stringify(store.service) : '[]';
        values.push(
          store.id,
          store.name,
          store.tel || '',
          store.address,
          store.lat,
          store.lng,
          store.city,
          store.area,
          serviceJson
        );
        
        const params = [];
        for (let j = 0; j < 9; j++) {
          params.push(`$${paramCount + j + 1}`);
        }
        placeholders.push(`(${params.join(', ')})`);
        paramCount += 9;
      }
      
      // 執行批量插入
      const query = `
        INSERT INTO stores (id, name, tel, address, lat, lng, city, area, service)
        VALUES ${placeholders.join(', ')}
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          tel = EXCLUDED.tel,
          address = EXCLUDED.address,
          lat = EXCLUDED.lat,
          lng = EXCLUDED.lng,
          city = EXCLUDED.city,
          area = EXCLUDED.area,
          service = EXCLUDED.service,
          updated_at = CURRENT_TIMESTAMP
      `;
      
      await pool.query(query, values);
      insertedCount += batch.length;
      
      if (insertedCount % 1000 === 0) {
        console.log(`已導入 ${insertedCount} 個門市...`);
      }
    }
    
    // 驗證導入結果
    const result = await pool.query('SELECT COUNT(*) as count FROM stores');
    const totalCount = result.rows[0].count;
    
    console.log(`✅ 成功導入 ${insertedCount} 個門市資料`);
    console.log(`📊 資料庫中總共有 ${totalCount} 個門市`);
    
    // 顯示一些樣本資料
    const samplesResult = await pool.query('SELECT id, name, city, area FROM stores LIMIT 5');
    console.log('📝 樣本資料:');
    samplesResult.rows.forEach(store => {
      console.log(`  - ${store.name} (${store.id}) - ${store.city}${store.area}`);
    });
    
  } catch (error) {
    console.error('❌ 導入門市資料時發生錯誤:', error.message);
    throw error;
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

// 如果直接執行此檔案
if (require.main === module) {
  import711StoresToPostgres()
    .then(() => {
      console.log('🎉 PostgreSQL 門市資料導入完成！');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 PostgreSQL 門市資料導入失敗:', error.message);
      process.exit(1);
    });
}

module.exports = { import711StoresToPostgres };