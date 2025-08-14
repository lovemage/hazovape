const Database = require('../config/database');

// 清理舊的本地圖片路徑，因為 Heroku 上這些文件不存在
async function cleanupOldImages() {
  console.log('🧹 開始清理舊的本地圖片路徑...');
  
  try {

    // 1. 清理產品圖片 - 移除不存在的本地圖片路徑
    console.log('📦 清理產品圖片...');
    const products = await Database.all('SELECT id, name, images FROM products');
    
    for (const product of products) {
      if (product.images) {
        const images = JSON.parse(product.images);
        // 只保留現在可用的圖片（示例圖片或Cloudinary URL）
        const validImages = images.filter(img => {
          // 保留示例圖片（product1_1.jpg等）和Cloudinary URL
          return (
            !img.includes('/uploads/') && !img.startsWith('products/') || 
            img.includes('cloudinary.com') ||
            img.match(/^product\d+_\d+\.jpg$/)
          );
        });
        
        if (validImages.length !== images.length) {
          console.log(`🔧 產品 "${product.name}" 圖片從 ${images.length} 張減少到 ${validImages.length} 張`);
          await Database.run(
            'UPDATE products SET images = ? WHERE id = ?',
            [JSON.stringify(validImages), product.id]
          );
        }
      }
    }

    // 2. 清理網站設置中的舊圖片路徑
    console.log('⚙️ 清理網站設置中的圖片...');
    const settingsToClean = [
      'popup_image',
      'hero_background_image',
      'order_complete_popup_image'
    ];
    
    for (const key of settingsToClean) {
      const setting = await Database.get(
        'SELECT setting_value FROM site_settings WHERE setting_key = ?',
        [key]
      );
      
      if (setting && setting.setting_value && setting.setting_value.includes('/uploads/')) {
        console.log(`🗑️ 清理設置 "${key}": ${setting.setting_value}`);
        // 清空舊的本地路徑
        await Database.run(
          'UPDATE site_settings SET setting_value = ? WHERE setting_key = ?',
          ['', key]
        );
      }
    }

    // 3. 檢查加購商品圖片（如果存在該表）
    try {
      const upsellProducts = await Database.all('SELECT id, name, images FROM upsell_products');
      if (upsellProducts.length > 0) {
        console.log('🛒 清理加購商品圖片...');
        
        for (const product of upsellProducts) {
          if (product.images) {
            const images = JSON.parse(product.images);
            const validImages = images.filter(img => 
              img.includes('cloudinary.com') || !img.includes('/uploads/')
            );
            
            if (validImages.length !== images.length) {
              console.log(`🔧 加購商品 "${product.name}" 圖片從 ${images.length} 張減少到 ${validImages.length} 張`);
              await Database.run(
                'UPDATE upsell_products SET images = ? WHERE id = ?',
                [JSON.stringify(validImages), product.id]
              );
            }
          }
        }
      }
    } catch (error) {
      console.log('ℹ️ 加購商品表不存在或無資料，跳過...');
    }

    console.log('✅ 舊圖片路徑清理完成！');
    
    // 顯示清理後的統計
    console.log('\n📊 清理後統計：');
    const remainingProducts = await Database.all(
      'SELECT name, images FROM products WHERE images IS NOT NULL AND images != \'[]\''
    );
    
    console.log('產品圖片狀況：');
    remainingProducts.forEach(product => {
      const images = JSON.parse(product.images || '[]');
      console.log(`- ${product.name}: ${images.length} 張圖片`);
    });

  } catch (error) {
    console.error('❌ 清理失敗:', error);
    throw error;
  }
}

// 如果直接執行此腳本
if (require.main === module) {
  cleanupOldImages()
    .then(() => {
      console.log('🎉 清理完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 清理失敗:', error);
      process.exit(1);
    });
}

module.exports = cleanupOldImages;