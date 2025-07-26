const Database = require('../config/database');

async function migrateVariantsToFlavors() {
  try {
    console.log('🔄 開始遷移產品規格數據...');

    // 1. 獲取所有有 variants 數據的產品
    const products = await Database.all(`
      SELECT id, name, variants 
      FROM products 
      WHERE variants IS NOT NULL AND variants != ''
    `);

    console.log(`📦 找到 ${products.length} 個產品有規格數據`);

    let totalMigrated = 0;

    // 2. 處理每個產品的 variants 數據
    for (const product of products) {
      console.log(`\n處理產品: ${product.name} (ID: ${product.id})`);
      
      try {
        const variants = JSON.parse(product.variants);
        console.log(`  - 找到 ${variants.length} 個規格`);

        // 3. 檢查是否已經有 flavors 數據
        const existingFlavors = await Database.all(
          'SELECT id FROM flavors WHERE product_id = ?',
          [product.id]
        );

        if (existingFlavors.length > 0) {
          console.log(`  - 跳過，已有 ${existingFlavors.length} 個規格數據`);
          continue;
        }

        // 4. 將每個 variant 插入到 flavors 表
        for (let i = 0; i < variants.length; i++) {
          const variant = variants[i];
          
          // 根據 variant.type 匹配 category_id
          let categoryId = 5; // 默認為 "規格"
          if (variant.type) {
            const typeMap = {
              '顏色': 1,
              '煙彈': 2,
              '配件': 3,
              '尼古丁濃度': 4
            };
            categoryId = typeMap[variant.type] || 5;
          }
          
          await Database.run(`
            INSERT INTO flavors (name, product_id, category_id, stock, is_active, sort_order, created_at)
            VALUES (?, ?, ?, 999, 1, ?, CURRENT_TIMESTAMP)
          `, [
            variant.name,
            product.id,
            categoryId,
            i + 1
          ]);

          totalMigrated++;
        }

        console.log(`  ✅ 成功遷移 ${variants.length} 個規格`);

      } catch (parseError) {
        console.error(`  ❌ 解析 variants 失敗:`, parseError.message);
      }
    }

    console.log(`\n🎉 遷移完成！總共遷移了 ${totalMigrated} 個規格`);

    // 5. 顯示結果統計
    const totalFlavors = await Database.get('SELECT COUNT(*) as count FROM flavors');
    console.log(`📊 現在 flavors 表中共有 ${totalFlavors.count} 個規格`);

    // 6. 顯示每個產品的規格數量
    const productFlavorCounts = await Database.all(`
      SELECT p.name, COUNT(f.id) as flavor_count
      FROM products p
      LEFT JOIN flavors f ON p.id = f.product_id
      WHERE p.is_active = 1
      GROUP BY p.id, p.name
      ORDER BY p.name
    `);

    console.log('\n📋 各產品規格數量:');
    productFlavorCounts.forEach(row => {
      console.log(`  - ${row.name}: ${row.flavor_count} 個規格`);
    });

  } catch (error) {
    console.error('❌ 遷移失敗:', error);
    throw error;
  }
}

// 如果直接運行此腳本
if (require.main === module) {
  migrateVariantsToFlavors()
    .then(() => {
      console.log('\n✅ 遷移腳本執行完成');
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ 遷移腳本執行失敗:', err);
      process.exit(1);
    });
}

module.exports = migrateVariantsToFlavors; 