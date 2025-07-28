const migrateAddProductSortOrder = require('./migrate-add-product-sort-order');

async function runProductionMigrations() {
  console.log('🚀 開始生產環境數據庫遷移...');
  
  try {
    // 運行產品排序字段遷移
    await migrateAddProductSortOrder();
    
    console.log('🎉 所有生產環境遷移完成！');
  } catch (error) {
    console.error('❌ 生產環境遷移失敗:', error);
    throw error;
  }
}

// 如果直接執行此腳本
if (require.main === module) {
  runProductionMigrations()
    .then(() => {
      console.log('✅ 生產環境遷移腳本執行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 生產環境遷移腳本執行失敗:', error);
      process.exit(1);
    });
}

module.exports = runProductionMigrations; 