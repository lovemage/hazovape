const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const Database = require('../config/database');

const products = [
  {
    name: 'OXVA NEXLIM 大蠻牛電子煙主機',
    description: 'OXVA NeXLIM 是 OXVA 推出的最新一代電子煙設備，採用創新的雙網格技術，提升風味表現，延長線圈壽命。配備 1500mAh 電池，4ml 大容量煙彈，支援 2A Type-C 快速充電。',
    specifications: `產品規格：
顏色選擇：
• Power Black - 力量黑
• Glory Red - 榮耀紅  
• Pearl Pink - 珍珠粉
• Rose Gold - 玫瑰金
• Black Gold - 黑金
• Dark Gray - 深灰
• Starry Blue - 星空藍
• Dark Blue - 深藍
• Pine Green - 松綠
• Dark Brown - 深棕
• Black Warrior - 黑武士
• Coral Orange - 珊瑚橙

煙彈規格：
• 0.6歐姆（3入）
• 0.8歐姆（3入）
• 1.2歐姆（3入）

主要特點：
• 強大的電池容量：內建 1500mAh 電池
• 雙網格技術：提升風味表現，延長線圈壽命
• 輸出功率：5W 至 40W 可調節
• 顯示螢幕：0.85 英寸彩色螢幕
• 操作模式：提供 BOOST 和 ECO 模式
• 煙彈容量：4ml 大容量煙彈
• 快速充電：支援 2A Type-C 快速充電
• 設計：鋅合金機身，多種顏色和材質面板`,
    price: 420,
    images: ['products/oxva-nexlim-daman-v2.jpg'],
    multi_discount: { 2: 0.95, 3: 0.9 }
  },
  {
    name: 'OXVA XLIM PRO 2 小蠻牛PRO 2電子煙主機',
    description: '採用了Oxva Xlim 系列的旗艦電子煙系統，在性能、壽命和設計方面取代了先前的型號。配備 1300 mAh 大電池，可享受四天的電子煙樂趣，半小時快速充電。',
    specifications: `產品規格：
顏色選擇：
• 黑武士 Black Knight
• 卡夢黑金 Carbon Black Gold
• 卡夢銀 Carbon Silver
• 夢幻紫 Dreamy Purple
• 夢幻灰 Dreamy Grey
• 皮革藍 Leather Blue
• 皮革綠 Leather Green
• 皮革粉 Leather Pink
• 皮革棕 Leather Brown
• 琥珀橙 Amber Orange

原廠小蠻牛 XLIM 系列煙彈：
• 0.4Ω
• 0.6Ω
• 0.8Ω

主要特點：
• 電池容量：1300 mAh 大電池
• 使用時間：可享受四天的電子煙樂趣
• 充電：半小時快速充電（USB Type-C）
• 顯示器：0.56 吋彩色高像素數顯示器
• 操作：單手操作，無縫切換介面
• 監控：即時使用情況監控`,
    price: 380,
    images: ['products/oxva-xlim-pro2-v2.jpg'],
    multi_discount: { 2: 0.95, 3: 0.9 }
  },
  {
    name: 'OXVA XLIM SQ PRO 2 小蠻牛 SQ PRO 2電子煙主機',
    description: 'OXVA XLIM SQ PRO 2 最新智慧電子煙主機，配備 1.09 吋 HD 智慧觸控螢幕，1600mAh 超大電池，ECO 模式下續航可達 7 天。支援 XLIM 全系列彈芯，相容性極高。',
    specifications: `產品規格：
顏色選擇：
• Black Carbon - 碳纖黑
• Black Leather - 皮革黑  
• Brown Leather - 皮革棕
• Gunmetal Wood - 槍灰木紋
• Brown Wood - 原木棕
• Blue Shadow - 深藍影
• Frost Marble - 霜雪大理石
• Celadon Marble - 青瓷大理石
• Dream Pink - 夢幻粉
• Dream Purple - 夢幻紫

原廠小蠻牛 XLIM 系列煙彈：
• 0.4Ω
• 0.6Ω
• 0.8Ω

產品亮點：
• 1.09 吋 HD 智慧觸控螢幕，支援 64 種畫面組合
• 1600mAh 超大電池，ECO 模式續航達 7 天
• 5–30W 輸出功率，支援 MTL/RDL 吸法
• 智慧吸嗨日誌，記錄 30 天使用趨勢
• 支援 XLIM 全系列彈芯（Top Fill、V2、EZ）
• Type-C 快充，45 分鐘內充滿電
• 側邊氣流調節（AFC），可依喜好調整吸阻
• 內建實用工具：手電筒、碼表、日曆、語言切換等`,
    price: 450,
    images: ['products/oxva-xlim-sq-pro2-v2.jpg'],
    multi_discount: { 2: 0.95, 3: 0.9 }
  },
  {
    name: 'Ripe Vapes VCT Coconut 尼古丁鹽',
    description: 'Ripe Vapes VCT Coconut 30ml 尼古丁鹽煙油，經典椰子煙草風味，順滑口感，適合追求經典口味的用戶。採用優質原料製作，確保穩定的品質和絕佳的口感體驗。',
    specifications: `產品規格：
• 品牌：Ripe Vapes
• 產品名稱：VCT Coconut
• 容量：30ml
• 類型：尼古丁鹽煙油
• 風味：椰子煙草
• 特點：順滑口感，經典風味
• 適用：MTL 電子煙設備
• 品質：優質原料製作，穩定品質`,
    price: 320,
    images: ['products/ripe-vapes-vct-coconut-v2.webp'],
    multi_discount: { 2: 0.95, 3: 0.9 }
  }
];

async function reuploadProducts() {
  try {
    console.log('🔄 開始重新上架產品...');
    
    // 1. 先刪除現有產品
    console.log('🗑️  刪除現有產品...');
    await Database.run('DELETE FROM products');
    await Database.run('DELETE FROM sqlite_sequence WHERE name = "products"');
    console.log('✅ 現有產品已清除');
    
    // 2. 重新上架產品
    for (const product of products) {
      console.log(`📦 正在上架產品: ${product.name}`);
      
      // 將描述和規格合併為完整描述
      const fullDescription = `${product.description}\n\n${product.specifications}`;
      
      const result = await Database.run(
        `INSERT INTO products (name, description, price, multi_discount, images, is_active)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          product.name,
          fullDescription,
          product.price,
          JSON.stringify(product.multi_discount),
          JSON.stringify(product.images),
          1
        ]
      );
      
      console.log(`✅ 產品上架成功，ID: ${result.id} - ${product.name} ($${product.price})`);
    }
    
    console.log('\n🎉 所有產品重新上架完成！');
    
    // 3. 驗證結果
    const allProducts = await Database.all('SELECT id, name, price FROM products ORDER BY id');
    console.log('\n📊 目前產品列表：');
    allProducts.forEach(p => {
      console.log(`  ID: ${p.id} | 名稱: ${p.name} | 價格: $${p.price}`);
    });
    
  } catch (error) {
    console.error('❌ 重新上架產品失敗:', error);
  } finally {
    await Database.close();
    console.log('🔐 數據庫連接已關閉');
    process.exit(0);
  }
}

reuploadProducts(); 