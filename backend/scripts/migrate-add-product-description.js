const Database = require('../config/database');

async function addProductDescription() {
  try {
    console.log('🚀 開始添加商品描述字段...');
    
    // 首先檢查 products 表是否存在
    const tableExists = await Database.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='products'"
    );
    
    if (!tableExists) {
      console.log('⚠️  products 表不存在，跳過 description 遷移');
      console.log('💡 請確保數據庫已正確初始化');
      return;
    }
    
    // 檢查字段是否已存在
    const tableInfo = await Database.all("PRAGMA table_info(products)");
    const hasDescription = tableInfo.some(column => column.name === 'description');
    
    if (hasDescription) {
      console.log('✅ description 字段已存在，跳過遷移');
      return;
    }
    
    // 添加 description 字段
    console.log('📝 添加 description 字段到 products 表...');
    await Database.run(`
      ALTER TABLE products 
      ADD COLUMN description TEXT DEFAULT ''
    `);
    
    console.log('✅ 成功添加 description 字段到 products 表');
    
    // 為現有產品添加描述
    console.log('📝 為現有產品添加默認描述...');
    
    const products = await Database.all('SELECT id, name FROM products');
    
    for (const product of products) {
      let defaultDescription = '';
      
      // 根據產品名稱生成默認描述
      if (product.name.includes('茶葉')) {
        defaultDescription = '精選優質茶葉，香氣濃郁，口感順滑，是品茶愛好者的首選。';
      } else if (product.name.includes('咖啡')) {
        defaultDescription = '來自世界各地的優質咖啡豆，烘焙工藝精湛，帶來豐富的層次感。';
      } else if (product.name.includes('餅乾')) {
        defaultDescription = '手工製作的精美餅乾，酥脆香甜，是下午茶的完美搭配。';
      } else {
        defaultDescription = `${product.name}，品質優良，值得信賴的選擇。`;
      }
      
      await Database.run(
        'UPDATE products SET description = ? WHERE id = ?',
        [defaultDescription, product.id]
      );
      
      console.log(`✅ 已為 "${product.name}" 添加描述`);
    }
    
    // 驗證更新
    const updatedTableInfo = await Database.all("PRAGMA table_info(products)");
    const descriptionField = updatedTableInfo.find(column => column.name === 'description');
    
    if (descriptionField) {
      console.log('✅ 驗證成功：description 字段已正確添加');
      console.log('📋 字段信息：', JSON.stringify(descriptionField, null, 2));
    }
    
    // 檢查更新的產品數量
    const productCount = await Database.get('SELECT COUNT(*) as count FROM products WHERE description IS NOT NULL AND description != ""');
    console.log(`📊 已更新產品數量：${productCount.count}`);
    
    console.log('🎉 商品描述功能數據庫遷移完成！');
    
  } catch (error) {
    console.error('❌ 添加商品描述字段失敗:', error);
    throw error;
  }
}

module.exports = addProductDescription;

// 如果直接執行此腳本
if (require.main === module) {
  addProductDescription().then(() => {
    console.log('✅ 遷移完成');
    process.exit(0);
  }).catch(error => {
    console.error('❌ 遷移失敗:', error);
    process.exit(1);
  });
} 