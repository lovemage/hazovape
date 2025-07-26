#!/usr/bin/env node

const Database = require('../config/database');

async function cleanImageReferences() {
  try {
    console.log('🧹 開始清理錯誤的圖片引用...');
    
    // 1. 檢查是否有引用 tea-gift-box.jpg 的記錄
    console.log('\n1. 檢查錯誤的圖片引用...');
    
    const productsWithBadImages = await Database.all(`
      SELECT id, name, images 
      FROM products 
      WHERE images LIKE '%tea-gift-box%'
    `);
    
    console.log(`📋 找到 ${productsWithBadImages.length} 個產品包含錯誤圖片引用`);
    
    if (productsWithBadImages.length > 0) {
      for (const product of productsWithBadImages) {
        console.log(`  - 產品 "${product.name}" (ID: ${product.id}): ${product.images}`);
        
        // 清理圖片引用
        await Database.run(
          'UPDATE products SET images = ? WHERE id = ?',
          ['[]', product.id]
        );
        console.log(`    ✅ 已清理產品 ${product.id} 的圖片引用`);
      }
    }
    
    // 2. 檢查其他可能的錯誤引用
    console.log('\n2. 檢查其他錯誤引用...');
    
    const allProducts = await Database.all(`
      SELECT id, name, images 
      FROM products 
      WHERE images IS NOT NULL AND images != '' AND images != '[]'
    `);
    
    console.log(`📋 檢查 ${allProducts.length} 個有圖片的產品`);
    
    for (const product of allProducts) {
      try {
        const images = JSON.parse(product.images);
        const validImages = images.filter(img => 
          img && 
          !img.includes('tea-gift-box') && 
          !img.includes('/images/products/') &&
          (img.startsWith('products/') || img.startsWith('http'))
        );
        
        if (validImages.length !== images.length) {
          console.log(`  🔧 修復產品 "${product.name}" 的圖片引用`);
          console.log(`    原始: ${JSON.stringify(images)}`);
          console.log(`    修復: ${JSON.stringify(validImages)}`);
          
          await Database.run(
            'UPDATE products SET images = ? WHERE id = ?',
            [JSON.stringify(validImages), product.id]
          );
        }
      } catch (error) {
        console.log(`  ⚠️  產品 "${product.name}" 圖片數據格式錯誤: ${product.images}`);
      }
    }
    
    // 3. 統計清理結果
    console.log('\n3. 清理結果統計...');
    
    const finalCheck = await Database.all(`
      SELECT COUNT(*) as count
      FROM products 
      WHERE images LIKE '%tea-gift-box%'
    `);
    
    const totalProducts = await Database.all(`
      SELECT COUNT(*) as count FROM products
    `);
    
    const productsWithImages = await Database.all(`
      SELECT COUNT(*) as count 
      FROM products 
      WHERE images IS NOT NULL AND images != '' AND images != '[]'
    `);
    
    console.log(`📊 清理統計:`);
    console.log(`  - 總產品數: ${totalProducts[0].count}`);
    console.log(`  - 有圖片的產品: ${productsWithImages[0].count}`);
    console.log(`  - 仍有錯誤引用: ${finalCheck[0].count}`);
    
    if (finalCheck[0].count === 0) {
      console.log('✅ 所有錯誤的圖片引用已清理完成！');
    } else {
      console.log('⚠️  仍有錯誤引用需要手動處理');
    }
    
    console.log('\n🎉 圖片引用清理完成！');
    
  } catch (error) {
    console.error('❌ 清理過程中發生錯誤:', error);
  } finally {
    await Database.close();
  }
}

// 如果直接運行此腳本
if (require.main === module) {
  cleanImageReferences();
}

module.exports = cleanImageReferences;
