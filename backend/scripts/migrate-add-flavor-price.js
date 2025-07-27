const Database = require('../config/database');

async function addFlavorPriceColumn() {
  try {
    console.log('🔄 開始為規格表添加價格字段...');

    // 檢查flavors表是否存在
    const tableExists = await Database.get(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='flavors'
    `);

    if (!tableExists) {
      console.log('❌ flavors表不存在，請先初始化數據庫');
      return;
    }

    // 檢查price字段是否已存在
    const columnExists = await Database.get(`
      PRAGMA table_info(flavors)
    `).then(async () => {
      const columns = await Database.all(`PRAGMA table_info(flavors)`);
      return columns.some(col => col.name === 'price');
    });

    if (columnExists) {
      console.log('✅ price字段已存在，跳過遷移');
      return;
    }

    // 添加price字段
    await Database.run(`
      ALTER TABLE flavors 
      ADD COLUMN price DECIMAL(10,2) NULL
    `);

    console.log('✅ 成功為flavors表添加price字段');

    // 更新現有數據：將現有規格的價格設為NULL（使用產品基礎價格）
    console.log('📝 更新現有規格數據...');
    
    // 可以選擇將現有規格價格設為對應產品的價格，或保持NULL
    // 這裡選擇保持NULL，讓規格使用產品基礎價格
    
    const flavorCount = await Database.get('SELECT COUNT(*) as count FROM flavors');
    console.log(`✅ 處理完成，共 ${flavorCount.count} 個規格保持使用產品基礎價格`);

    console.log('🎉 規格價格字段遷移完成！');
    console.log('');
    console.log('📋 新功能說明：');
    console.log('- 規格現在可以獨立定價');
    console.log('- price為NULL時使用產品基礎價格');
    console.log('- price有值時使用規格獨立價格');
    console.log('- admin可以在規格管理頁面設定各規格價格');

  } catch (error) {
    console.error('❌ 添加規格價格字段失敗:', error);
    throw error;
  }
}

// 如果直接運行此腳本
if (require.main === module) {
  addFlavorPriceColumn()
    .then(() => {
      console.log('✅ 遷移完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 遷移失敗:', error);
      process.exit(1);
    });
}

module.exports = { addFlavorPriceColumn }; 