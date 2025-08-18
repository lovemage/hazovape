const { Pool } = require('pg');
const fs = require('fs');

// 從環境變數或直接使用 DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://ue3uarl7re8foe:pa468a02d887c6951aff6f966586eb2ec75226592ec4108dba92f2729b5fc2bfa@cee3ebbhveeoab.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/dbjm3cvn1cu4ah',
  ssl: {
    rejectUnauthorized: false
  }
});

async function importProducts() {
  const client = await pool.connect();
  
  try {
    console.log('開始讀取產品數據...');
    const data = JSON.parse(fs.readFileSync('railway-products-correct-2025-08-18-15-03-09.json', 'utf8'));
    
    console.log(`找到 ${data.products.length} 個產品，共 ${data.export_info.total_variants} 個規格`);
    
    // 清空現有數據（如果需要）
    console.log('清空現有數據...');
    await client.query('DELETE FROM flavors');
    await client.query('DELETE FROM products');
    await client.query('ALTER SEQUENCE products_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE flavors_id_seq RESTART WITH 1');
    
    // 分批處理產品
    const BATCH_SIZE = 5;
    const batches = [];
    for (let i = 0; i < data.products.length; i += BATCH_SIZE) {
      batches.push(data.products.slice(i, i + BATCH_SIZE));
    }
    
    console.log(`將分 ${batches.length} 批處理`);
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`\n處理第 ${batchIndex + 1}/${batches.length} 批...`);
      
      // 開始批次事務
      await client.query('BEGIN');
      
      try {
        for (const product of batch) {
          console.log(`  處理產品: ${product.name}`);
          
          // 插入產品
          const productResult = await client.query(`
            INSERT INTO products (name, description, price, category)
            VALUES ($1, $2, $3, $4)
            RETURNING id
          `, [
            product.name,
            product.description || '',
            product.price,
            product.category || 'disposable'
          ]);
          
          const productId = productResult.rows[0].id;
          
          // 批量插入規格/口味
          if (product.variants && product.variants.length > 0) {
            const flavorValues = [];
            const flavorParams = [];
            let paramIndex = 1;
            
            for (const variant of product.variants) {
              flavorValues.push(`($${paramIndex}, $${paramIndex+1}, $${paramIndex+2}, $${paramIndex+3})`);
              flavorParams.push(
                `${variant.variant_type}: ${variant.variant_value}`,
                productId,
                variant.stock,
                product.price + (variant.price_modifier || 0)
              );
              paramIndex += 4;
            }
            
            const flavorSQL = `INSERT INTO flavors (name, product_id, stock, price) VALUES ${flavorValues.join(', ')}`;
            await client.query(flavorSQL, flavorParams);
            
            console.log(`    - 已插入 ${product.variants.length} 個規格`);
          } else {
            // 如果沒有規格，創建一個預設規格
            await client.query(`
              INSERT INTO flavors (name, product_id, stock, price)
              VALUES ($1, $2, $3, $4)
            `, [
              '預設',
              productId,
              product.stock || 0,
              product.price
            ]);
            console.log(`    - 已插入預設規格`);
          }
        }
        
        // 提交批次事務
        await client.query('COMMIT');
        console.log(`  第 ${batchIndex + 1} 批處理完成`);
        
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`第 ${batchIndex + 1} 批處理失敗:`, error);
        throw error;
      }
    }
    
    console.log('\n數據導入完成！');
    
    // 顯示統計資訊
    const productCount = await client.query('SELECT COUNT(*) FROM products');
    const flavorCount = await client.query('SELECT COUNT(*) FROM flavors');
    
    console.log(`\n統計資訊:`);
    console.log(`- 產品總數: ${productCount.rows[0].count}`);
    console.log(`- 規格總數: ${flavorCount.rows[0].count}`);
    
  } catch (error) {
    console.error('導入失敗:', error);
    throw error;
  } finally {
    client.release();
  }
}

// 執行導入
importProducts()
  .then(() => {
    console.log('導入成功完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('導入失敗:', error);
    process.exit(1);
  });