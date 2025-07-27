const Database = require('../config/database');

async function updateVapeFlavorCategories() {
  try {
    console.log('🔄 開始更新電子煙規格分類...');

    // 檢查flavor_categories表是否存在
    const tableExists = await Database.get(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='flavor_categories'
    `);

    if (!tableExists) {
      console.log('❌ flavor_categories表不存在，請先初始化數據庫');
      return;
    }

    // 1. 清空現有分類（保留ID結構）
    console.log('1. 更新規格分類為電子煙分類...');
    
    // 電子煙規格分類
    const vapeCategories = [
      { id: 1, name: '顏色系列', description: '主機顏色規格（黑、灰、銀、粉、紫、藍等）', sort_order: 1 },
      { id: 2, name: '煙彈系列', description: '煙彈相關規格', sort_order: 2 },
      { id: 3, name: '阻值系列', description: '電阻值規格（0.6Ω、0.8Ω等）', sort_order: 3 },
      { id: 4, name: '配件系列', description: '配件相關規格', sort_order: 4 },
      { id: 5, name: '規格系列', description: '其他產品規格', sort_order: 5 }
    ];

    // 2. 更新每個分類
    for (const category of vapeCategories) {
      await Database.run(`
        UPDATE flavor_categories 
        SET name = ?, description = ?, sort_order = ?, is_active = 1
        WHERE id = ?
      `, [category.name, category.description, category.sort_order, category.id]);
      
      console.log(`✅ 更新分類 ${category.id}: ${category.name}`);
    }

    // 3. 刪除多餘的分類（ID > 5）
    const existingCategories = await Database.all('SELECT id FROM flavor_categories WHERE id > 5');
    for (const cat of existingCategories) {
      await Database.run('DELETE FROM flavor_categories WHERE id = ?', [cat.id]);
      console.log(`🗑️ 刪除多餘分類 ID: ${cat.id}`);
    }

    // 4. 智能分類現有規格
    console.log('2. 智能分類現有規格...');
    
    const flavors = await Database.all('SELECT id, name FROM flavors');
    let reclassifiedCount = 0;

    for (const flavor of flavors) {
      let newCategoryId = 5; // 默認：規格系列
      const flavorName = flavor.name.toLowerCase();

      // 顏色系列判斷
      if (['黑', '灰', '銀', '粉', '紫', '藍', '白', '紅', '綠', '橙', 'black', 'gray', 'silver', 'pink', 'purple', 'blue', 'white', 'red', 'green', 'orange', '午夜藍', '冷酷銀', '深空灰', '賽車綠', '霧棕色', '霧霾藍', '珍珠白', '彩虹紫', '橙藍', '粉色'].some(color => flavorName.includes(color))) {
        newCategoryId = 1; // 顏色系列
      }
      // 煙彈系列判斷
      else if (['煙彈', '煙蛋', 'pod', 'cartridge', 'c1', 's1'].some(term => flavorName.includes(term))) {
        newCategoryId = 2; // 煙彈系列
      }
      // 阻值系列判斷
      else if (['0.6', '0.8', '1.0', '1.2', 'ω', 'ohm', '芯'].some(term => flavorName.includes(term))) {
        newCategoryId = 3; // 阻值系列
      }
      // 配件系列判斷
      else if (['充電', '保護', '套', '線', '配件', '隨機'].some(term => flavorName.includes(term))) {
        newCategoryId = 4; // 配件系列
      }

      // 更新規格分類
      await Database.run('UPDATE flavors SET category_id = ? WHERE id = ?', [newCategoryId, flavor.id]);
      reclassifiedCount++;
    }

    console.log(`✅ 完成智能分類，處理 ${reclassifiedCount} 個規格`);

    // 5. 顯示分類統計
    console.log('3. 分類統計:');
    for (const category of vapeCategories) {
      const count = await Database.get(
        'SELECT COUNT(*) as count FROM flavors WHERE category_id = ?',
        [category.id]
      );
      console.log(`   ${category.name}: ${count.count} 個規格`);
    }

    console.log('🎉 電子煙規格分類更新完成！');
    console.log('');
    console.log('📋 新分類說明：');
    console.log('- 顏色系列：黑、灰、銀、粉、紫、藍等顏色');
    console.log('- 煙彈系列：各種煙彈和煙蛋規格');
    console.log('- 阻值系列：0.6Ω、0.8Ω等電阻值');
    console.log('- 配件系列：配件和附件');
    console.log('- 規格系列：其他產品規格');

  } catch (error) {
    console.error('❌ 更新電子煙規格分類失敗:', error);
    throw error;
  }
}

// 如果直接運行此腳本
if (require.main === module) {
  updateVapeFlavorCategories()
    .then(() => {
      console.log('✅ 遷移完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 遷移失敗:', error);
      process.exit(1);
    });
}

module.exports = { updateVapeFlavorCategories }; 