const Database = require('../config/database');

async function addFlavorImageColumn() {
  try {
    console.log('🔄 開始為規格表添加圖片字段...');

    // 檢查flavors表是否存在
    const tableExists = await Database.get(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='flavors'
    `);

    if (!tableExists) {
      console.log('❌ flavors表不存在，請先初始化數據庫');
      return;
    }

    // 檢查image字段是否已存在
    const columnExists = await Database.get(`
      PRAGMA table_info(flavors)
    `).then(async () => {
      const columns = await Database.all(`PRAGMA table_info(flavors)`);
      return columns.some(col => col.name === 'image');
    });

    if (columnExists) {
      console.log('✅ image字段已存在，跳過遷移');
      return;
    }

    // 添加image字段
    await Database.run(`
      ALTER TABLE flavors 
      ADD COLUMN image TEXT NULL
    `);

    console.log('✅ 成功為flavors表添加image字段');

    // 檢查現有規格數量
    const flavorCount = await Database.get('SELECT COUNT(*) as count FROM flavors');
    console.log(`📝 現有規格數量: ${flavorCount.count}`);
    
    console.log('🎉 規格圖片字段遷移完成！');
    console.log('');
    console.log('📋 新功能說明：');
    console.log('- 規格現在可以上傳獨立圖片');
    console.log('- image為NULL時使用產品主圖片');
    console.log('- image有值時在產品詳細頁面選擇規格時顯示對應圖片');
    console.log('- admin可以在規格管理頁面為各規格上傳圖片');
    console.log('- 支持用戶在選擇規格時預覽對應款式');

  } catch (error) {
    console.error('❌ 添加規格圖片字段失敗:', error);
    throw error;
  }
}

// 如果直接運行此腳本
if (require.main === module) {
  addFlavorImageColumn()
    .then(() => {
      console.log('✅ 遷移完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 遷移失敗:', error);
      process.exit(1);
    });
}

module.exports = { addFlavorImageColumn };