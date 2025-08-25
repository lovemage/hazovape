const { Pool } = require('pg');

async function migrateAddDisableCouponPG() {
  console.log('🔄 開始遷移：添加產品禁止優惠券功能 (PostgreSQL)...');

  // 使用 Heroku 的 DATABASE_URL
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.log('❌ 未找到 DATABASE_URL 環境變數');
    return;
  }

  const pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // 檢查欄位是否已存在
    const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'disable_coupon'
    `);

    if (checkColumn.rows.length > 0) {
      console.log('✅ disable_coupon 欄位已存在');
      return;
    }

    console.log('🆕 添加 disable_coupon 欄位到 products 表...');
    
    // 添加欄位
    await pool.query(`
      ALTER TABLE products 
      ADD COLUMN disable_coupon BOOLEAN DEFAULT FALSE
    `);
    
    console.log('✅ disable_coupon 欄位添加完成');
    
    // 檢查產品總數
    const productCount = await pool.query('SELECT COUNT(*) as count FROM products');
    console.log(`📈 產品總數: ${productCount.rows[0].count} 個`);
    
    console.log('🎉 PostgreSQL 禁止優惠券功能遷移完成！');
    
  } catch (error) {
    console.error('❌ 遷移失敗:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  migrateAddDisableCouponPG()
    .then(() => {
      console.log('✅ PostgreSQL 遷移完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ PostgreSQL 遷移失敗:', error);
      process.exit(1);
    });
}

module.exports = migrateAddDisableCouponPG;