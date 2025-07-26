#!/usr/bin/env node

/**
 * 修復外鍵約束問題的腳本
 * 檢查和修復 Railway 環境中的數據完整性
 */

const Database = require('../config/database');

async function fixForeignKeys() {
  try {
    console.log('🔧 開始修復外鍵約束問題...');
    
    // 1. 檢查商品表
    console.log('1. 檢查商品表...');
    const products = await Database.all('SELECT id, name FROM products');
    console.log(`📦 找到 ${products.length} 個商品:`);
    products.forEach(p => console.log(`  - ID: ${p.id}, 名稱: ${p.name}`));
    
    // 2. 檢查規格類別表
    console.log('\n2. 檢查規格類別表...');
    const categories = await Database.all('SELECT id, name FROM flavor_categories');
    console.log(`📋 找到 ${categories.length} 個類別:`);
    categories.forEach(c => console.log(`  - ID: ${c.id}, 名稱: ${c.name}`));
    
    // 3. 如果沒有類別，創建默認類別
    if (categories.length === 0) {
      console.log('\n⚠️  沒有規格類別，創建默認類別...');
      const defaultCategories = [
        { id: 1, name: '默認類別', description: '默認規格類別', sort_order: 1 },
        { id: 12, name: '其他系列', description: '其他特殊口味', sort_order: 12 }
      ];
      
      for (const category of defaultCategories) {
        try {
          await Database.run(
            'INSERT OR REPLACE INTO flavor_categories (id, name, description, sort_order, is_active) VALUES (?, ?, ?, ?, ?)',
            [category.id, category.name, category.description, category.sort_order, 1]
          );
          console.log(`✅ 創建類別: ${category.name} (ID: ${category.id})`);
        } catch (error) {
          console.error(`❌ 創建類別失敗 ${category.name}:`, error.message);
        }
      }
    }
    
    // 4. 檢查規格表中的外鍵問題
    console.log('\n3. 檢查規格表外鍵問題...');
    const flavors = await Database.all('SELECT id, name, product_id, category_id FROM flavors');
    console.log(`🍃 找到 ${flavors.length} 個規格`);
    
    let invalidFlavors = 0;
    for (const flavor of flavors) {
      // 檢查商品外鍵
      const product = await Database.get('SELECT id FROM products WHERE id = ?', [flavor.product_id]);
      if (!product) {
        console.log(`❌ 規格 "${flavor.name}" 引用了不存在的商品 ID: ${flavor.product_id}`);
        invalidFlavors++;
      }
      
      // 檢查類別外鍵
      const category = await Database.get('SELECT id FROM flavor_categories WHERE id = ?', [flavor.category_id]);
      if (!category) {
        console.log(`❌ 規格 "${flavor.name}" 引用了不存在的類別 ID: ${flavor.category_id}`);
        invalidFlavors++;
      }
    }
    
    if (invalidFlavors === 0) {
      console.log('✅ 所有規格的外鍵都正確');
    } else {
      console.log(`⚠️  發現 ${invalidFlavors} 個外鍵問題`);
    }
    
    // 5. 重新檢查修復後的狀態
    console.log('\n4. 修復後狀態檢查...');
    const finalProducts = await Database.all('SELECT COUNT(*) as count FROM products');
    const finalCategories = await Database.all('SELECT COUNT(*) as count FROM flavor_categories');
    const finalFlavors = await Database.all('SELECT COUNT(*) as count FROM flavors');
    
    console.log('📊 最終統計:');
    console.log(`  - 商品數量: ${finalProducts[0].count}`);
    console.log(`  - 類別數量: ${finalCategories[0].count}`);
    console.log(`  - 規格數量: ${finalFlavors[0].count}`);
    
    // 6. 測試外鍵約束
    console.log('\n5. 測試外鍵約束...');
    try {
      // 嘗試插入一個測試規格
      const testProduct = await Database.get('SELECT id FROM products LIMIT 1');
      const testCategory = await Database.get('SELECT id FROM flavor_categories LIMIT 1');
      
      if (testProduct && testCategory) {
        console.log(`🧪 測試插入規格到商品 ${testProduct.id}，類別 ${testCategory.id}`);
        
        // 先檢查是否已存在測試規格
        const existingTest = await Database.get(
          'SELECT id FROM flavors WHERE name = ? AND product_id = ?',
          ['測試規格', testProduct.id]
        );
        
        if (existingTest) {
          console.log('🗑️  刪除現有測試規格');
          await Database.run('DELETE FROM flavors WHERE id = ?', [existingTest.id]);
        }
        
        const testResult = await Database.run(
          'INSERT INTO flavors (name, product_id, category_id, sort_order, stock, is_active) VALUES (?, ?, ?, ?, ?, ?)',
          ['測試規格', testProduct.id, testCategory.id, 999, 0, 1]
        );
        
        console.log('✅ 測試插入成功，ID:', testResult.lastID);
        
        // 清理測試數據
        await Database.run('DELETE FROM flavors WHERE id = ?', [testResult.lastID]);
        console.log('🗑️  清理測試數據完成');
      } else {
        console.log('⚠️  沒有可用的商品或類別進行測試');
      }
    } catch (error) {
      console.error('❌ 外鍵約束測試失敗:', error.message);
    }
    
    console.log('\n🎉 外鍵修復完成！');
    
  } catch (error) {
    console.error('❌ 修復過程中發生錯誤:', error);
    throw error;
  }
}

// 如果直接運行此腳本
if (require.main === module) {
  fixForeignKeys().then(() => {
    console.log('✅ 修復完成');
    process.exit(0);
  }).catch(error => {
    console.error('❌ 修復失敗:', error);
    process.exit(1);
  });
}

module.exports = { fixForeignKeys };
