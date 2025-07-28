const Database = require('../config/database');

async function migrateAddProductSortOrder() {
  console.log('🔄 開始為 products 表添加 sort_order 字段...');

  try {
    // 檢查是否已經有 sort_order 字段
    const tableInfo = await Database.all("PRAGMA table_info(products)");
    const hasSortOrder = tableInfo.some(col => col.name === 'sort_order');

    if (hasSortOrder) {
      console.log('⚠️ sort_order 字段已存在，檢查是否需要重新初始化...');
      
      // 檢查是否所有產品的sort_order都是連續的1,2,3...（表示是動態添加的）
      const products = await Database.all('SELECT id, sort_order FROM products ORDER BY sort_order ASC');
      const isSequential = products.length > 0 && 
        products.every((product, index) => product.sort_order === index + 1);
      
      if (isSequential) {
        console.log('🔄 檢測到連續排序值，重新初始化為非連續值...');
        // 重新設置為非連續值
        for (let i = 0; i < products.length; i++) {
          const sortOrder = (i + 1) * 10; // 10, 20, 30, 40...
          await Database.run(
            'UPDATE products SET sort_order = ? WHERE id = ?',
            [sortOrder, products[i].id]
          );
        }
        console.log(`✅ 已重新初始化 ${products.length} 個產品的排序值`);
        return;
      } else {
        console.log('✅ sort_order 字段已正確初始化，跳過遷移');
        return;
      }
    }

    console.log('📊 當前表結構:', tableInfo.map(col => col.name).join(', '));

    // 添加 sort_order 字段
    await Database.run(`
      ALTER TABLE products 
      ADD COLUMN sort_order INTEGER DEFAULT 0
    `);

    console.log('✅ 成功添加 sort_order 字段');

    // 為現有產品設置初始排序值（按創建時間順序）
    // 使用 id * 10 來避免連續數字，讓前端能識別這是真實的排序字段
    const products = await Database.all('SELECT id FROM products ORDER BY created_at ASC');
    
    for (let i = 0; i < products.length; i++) {
      const sortOrder = (i + 1) * 10; // 10, 20, 30, 40... 避免連續數字
      await Database.run(
        'UPDATE products SET sort_order = ? WHERE id = ?',
        [sortOrder, products[i].id]
      );
    }

    console.log(`✅ 為 ${products.length} 個產品設置了初始排序值`);

    // 驗證遷移結果
    const updatedTableInfo = await Database.all("PRAGMA table_info(products)");
    console.log('📊 更新後表結構:', updatedTableInfo.map(col => col.name).join(', '));

    console.log('🎉 產品排序字段遷移完成！');

  } catch (error) {
    console.error('❌ 遷移失敗:', error);
    throw error;
  }
}

// 如果直接執行此腳本
if (require.main === module) {
  migrateAddProductSortOrder()
    .then(() => {
      console.log('✅ 遷移腳本執行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 遷移腳本執行失敗:', error);
      process.exit(1);
    });
}

module.exports = migrateAddProductSortOrder; 