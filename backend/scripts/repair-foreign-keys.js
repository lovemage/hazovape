#!/usr/bin/env node

const Database = require('../config/database');

async function repairForeignKeys() {
  try {
    console.log('🔧 開始修復外鍵約束問題...');
    
    // 1. 檢查並創建缺失的類別
    console.log('\n1. 檢查並創建缺失的類別...');
    
    // 獲取所有被引用但不存在的類別ID
    const missingCategories = await Database.all(`
      SELECT DISTINCT category_id 
      FROM flavors 
      WHERE category_id NOT IN (
        SELECT id FROM flavor_categories
      )
    `);
    
    console.log(`📋 發現 ${missingCategories.length} 個缺失的類別ID:`, 
      missingCategories.map(c => c.category_id));
    
    // 創建缺失的類別
    const categoryMappings = {
      2: { name: '果味系列', description: '各種水果口味' },
      8: { name: '特調系列', description: '特色調配口味' },
      12: { name: '冰品系列', description: '冰涼口味系列' }
    };
    
    for (const missing of missingCategories) {
      const categoryId = missing.category_id;
      const categoryInfo = categoryMappings[categoryId] || {
        name: `類別${categoryId}`,
        description: `自動創建的類別 ${categoryId}`
      };
      
      try {
        await Database.run(`
          INSERT OR REPLACE INTO flavor_categories 
          (id, name, description, sort_order, is_active) 
          VALUES (?, ?, ?, ?, ?)
        `, [categoryId, categoryInfo.name, categoryInfo.description, categoryId, 1]);
        
        console.log(`✅ 創建類別 ID ${categoryId}: ${categoryInfo.name}`);
      } catch (error) {
        console.error(`❌ 創建類別 ${categoryId} 失敗:`, error.message);
      }
    }
    
    // 2. 驗證修復結果
    console.log('\n2. 驗證修復結果...');
    
    const remainingIssues = await Database.all(`
      SELECT f.name, f.category_id
      FROM flavors f
      WHERE f.category_id NOT IN (
        SELECT id FROM flavor_categories
      )
      LIMIT 10
    `);
    
    if (remainingIssues.length === 0) {
      console.log('✅ 所有外鍵問題已修復！');
    } else {
      console.log(`⚠️  仍有 ${remainingIssues.length} 個問題需要處理`);
      remainingIssues.forEach(issue => {
        console.log(`  - 規格 "${issue.name}" 引用類別 ID: ${issue.category_id}`);
      });
    }
    
    // 3. 統計最終狀態
    console.log('\n3. 最終統計...');
    const stats = await Database.all(`
      SELECT 
        (SELECT COUNT(*) FROM products) as products,
        (SELECT COUNT(*) FROM flavor_categories) as categories,
        (SELECT COUNT(*) FROM flavors) as flavors,
        (SELECT COUNT(*) FROM flavors WHERE category_id IN (SELECT id FROM flavor_categories)) as valid_flavors
    `);
    
    const stat = stats[0];
    console.log(`📊 數據統計:`);
    console.log(`  - 商品數量: ${stat.products}`);
    console.log(`  - 類別數量: ${stat.categories}`);
    console.log(`  - 規格總數: ${stat.flavors}`);
    console.log(`  - 有效規格: ${stat.valid_flavors}`);
    console.log(`  - 修復率: ${((stat.valid_flavors / stat.flavors) * 100).toFixed(1)}%`);
    
    console.log('\n🎉 外鍵修復完成！');
    
  } catch (error) {
    console.error('❌ 修復過程中發生錯誤:', error);
  } finally {
    await Database.close();
  }
}

// 如果直接運行此腳本
if (require.main === module) {
  repairForeignKeys();
}

module.exports = repairForeignKeys;
