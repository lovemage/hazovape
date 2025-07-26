const Database = require('../config/database');

async function redesignFlavorSystem() {
  try {
    console.log('開始重新設計口味系統...');
    console.log('新邏輯：口味依附在商品下方，每個商品有自己的口味選項');
    
    // 1. 創建口味類別表
    console.log('1. 創建口味類別表...');
    await Database.run(`
      CREATE TABLE IF NOT EXISTS flavor_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ 口味類別表創建成功');
    
    // 2. 重新設計 flavors 表結構
    console.log('2. 重新設計口味表結構...');
    
    // 檢查是否需要添加字段
    const tableInfo = await Database.all("PRAGMA table_info(flavors)");
    const hasProductId = tableInfo.some(column => column.name === 'product_id');
    const hasCategoryId = tableInfo.some(column => column.name === 'category_id');
    
    if (!hasProductId) {
      await Database.run('ALTER TABLE flavors ADD COLUMN product_id INTEGER');
      console.log('✅ 為口味表添加了商品ID字段');
    }
    
    if (!hasCategoryId) {
      await Database.run('ALTER TABLE flavors ADD COLUMN category_id INTEGER DEFAULT 1');
      console.log('✅ 為口味表添加了類別ID字段');
    }
    
    // 3. 插入默認類別
    console.log('3. 插入默認類別...');
    
    const defaultCategories = [
      { name: '茶葉系列', description: '各種茶葉口味', sort_order: 1 },
      { name: '咖啡系列', description: '各種咖啡口味', sort_order: 2 },
      { name: '奶茶系列', description: '各種奶茶口味', sort_order: 3 },
      { name: '果茶系列', description: '各種果茶口味', sort_order: 4 },
      { name: '特調系列', description: '特色調配口味', sort_order: 5 },
      { name: '其他系列', description: '其他特殊口味', sort_order: 6 }
    ];
    
    for (const category of defaultCategories) {
      try {
        await Database.run(
          'INSERT OR IGNORE INTO flavor_categories (name, description, sort_order) VALUES (?, ?, ?)',
          [category.name, category.description, category.sort_order]
        );
        console.log(`✅ 添加類別: ${category.name}`);
      } catch (error) {
        console.log(`⚠️  類別 ${category.name} 已存在`);
      }
    }
    
    // 4. 獲取現有商品和口味
    console.log('4. 分析現有數據...');
    
    const products = await Database.all('SELECT id, name FROM products WHERE is_active = 1');
    const existingFlavors = await Database.all('SELECT id, name, stock FROM flavors WHERE product_id IS NULL');
    
    console.log(`找到 ${products.length} 個商品`);
    console.log(`找到 ${existingFlavors.length} 個未分配的口味`);
    
    // 5. 為每個商品創建基本口味
    console.log('5. 為每個商品創建基本口味...');
    
    // 基本口味模板（每個商品都會有這些基本口味）
    const basicFlavors = [
      { name: '原味', category_id: 1, sort_order: 1, stock: 100 },
      { name: '微糖', category_id: 1, sort_order: 2, stock: 100 },
      { name: '半糖', category_id: 1, sort_order: 3, stock: 100 },
      { name: '少糖', category_id: 1, sort_order: 4, stock: 100 },
      { name: '無糖', category_id: 1, sort_order: 5, stock: 100 }
    ];
    
    for (const product of products) {
      console.log(`為商品 "${product.name}" 創建基本口味...`);
      
      for (const flavor of basicFlavors) {
        try {
          await Database.run(
            'INSERT INTO flavors (name, product_id, category_id, sort_order, stock) VALUES (?, ?, ?, ?, ?)',
            [`${product.name}-${flavor.name}`, product.id, flavor.category_id, flavor.sort_order, flavor.stock]
          );
          console.log(`  ✅ 創建口味: ${product.name}-${flavor.name}`);
        } catch (error) {
          console.log(`  ⚠️  口味已存在: ${product.name}-${flavor.name}`);
        }
      }
    }
    
    // 6. 處理現有的全局口味
    console.log('6. 處理現有的全局口味...');
    
    if (existingFlavors.length > 0 && products.length > 0) {
      // 將現有口味分配給第一個商品作為示例
      const firstProduct = products[0];
      console.log(`將現有口味分配給商品 "${firstProduct.name}"`);
      
      for (const flavor of existingFlavors) {
        await Database.run(
          'UPDATE flavors SET product_id = ?, category_id = 6 WHERE id = ?',
          [firstProduct.id, flavor.id]
        );
        console.log(`  ✅ 分配口味 "${flavor.name}" 到商品 "${firstProduct.name}"`);
      }
    }
    
    // 7. 驗證結果
    console.log('7. 驗證結果...');
    
    const categories = await Database.all('SELECT * FROM flavor_categories ORDER BY sort_order');
    const flavorsWithDetails = await Database.all(`
      SELECT f.id, f.name, f.stock, f.sort_order,
             p.name as product_name,
             fc.name as category_name
      FROM flavors f 
      LEFT JOIN products p ON f.product_id = p.id
      LEFT JOIN flavor_categories fc ON f.category_id = fc.id 
      ORDER BY p.name, fc.sort_order, f.sort_order
    `);
    
    console.log('\n📊 類別列表:');
    categories.forEach(cat => {
      console.log(`- ${cat.name} (ID: ${cat.id}): ${cat.description}`);
    });
    
    console.log('\n📊 口味分配結果:');
    let currentProduct = '';
    flavorsWithDetails.forEach(flavor => {
      if (flavor.product_name !== currentProduct) {
        currentProduct = flavor.product_name;
        console.log(`\n🛍️  商品: ${flavor.product_name || '未分配'}`);
      }
      console.log(`  - ${flavor.name} (庫存: ${flavor.stock}) [${flavor.category_name || '未分類'}]`);
    });
    
    console.log('\n✅ 口味系統重新設計完成！');
    console.log('');
    console.log('新的口味管理流程：');
    console.log('1. 選擇商品（口味依附的商品）');
    console.log('2. 選擇類別（茶葉、咖啡、奶茶等）');
    console.log('3. 輸入口味名稱');
    console.log('4. 設置排序順序');
    console.log('5. 設置庫存數量');
    console.log('');
    console.log('特點：');
    console.log('- 每個商品有自己的口味選項');
    console.log('- 口味可以按類別分組');
    console.log('- 每個口味有獨立的庫存');
    console.log('- 支援同一口味在不同商品中有不同庫存');
    
  } catch (error) {
    console.error('重新設計口味系統失敗:', error);
    throw error;
  }
}

// 如果直接運行此腳本
if (require.main === module) {
  redesignFlavorSystem().then(() => {
    console.log('腳本執行完成');
    process.exit(0);
  }).catch(err => {
    console.error('腳本執行失敗:', err);
    process.exit(1);
  });
}

module.exports = redesignFlavorSystem;
