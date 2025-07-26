#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 數據庫路徑
const dbPath = path.join(__dirname, '../data/mistmall.db');
const db = new sqlite3.Database(dbPath);

console.log('🚀 開始重新上架所有產品（包含完整規格）...');

// 根據中央廚房文檔的完整產品數據
const products = [
  {
    id: 1,
    name: 'OXVA NEXLIM 大蠻牛電子煙主機',
    price: 420,
    multi_discount: JSON.stringify({"2": 0.95, "3": 0.9}),
    images: JSON.stringify(["products/oxva-nexlim-daman-v2.jpg"]),
    is_active: 1,
    description: `OXVA NeXLIM 是 OXVA 推出的最新一代電子煙設備，旨在為用戶提供卓越的體驗。

🔋 主要特點：
• 強大的電池容量：內建 1500mAh 電池，提供持久的使用時間
• 雙網格技術：採用創新的雙網格技術，提升風味表現，延長線圈壽命
• 輸出功率：可調節功率範圍為 5W 至 40W，滿足不同的吸煙需求
• 顯示螢幕：配備 0.85 英寸彩色螢幕，提供清晰的資訊顯示
• 操作模式：提供 BOOST 和 ECO 模式，讓用戶根據喜好調整體驗
• 煙彈容量：4ml 大容量煙彈，減少頻繁加油的麻煩
• 快速充電：支援 2A Type-C 快速充電，縮短充電時間

🎨 顏色規格（12款）：
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

🔧 NEXLIM新版煙彈規格：
• 0.6歐姆（3入裝）
• 0.8歐姆（3入裝）  
• 1.2歐姆（3入裝）

🔌 轉接頭：
• 轉接頭（套上後適用舊版煙彈）

📦 產品分類：主機、煙彈、轉接頭

🏗️ 設計與外觀：
NeXLIM 採用鋅合金機身，搭配多種顏色和材質的面板設計，滿足不同用戶的審美需求。

✨ 使用體驗：
NeXLIM 的雙網格技術提供了卓越的風味體驗，BOOST 模式下風味更為濃郁，而 ECO 模式則延長電池和線圈的使用壽命。精確的氣流控制和自動啟動功能進一步提升了使用的便利性和滿意度。`,
    variants: JSON.stringify([
      // 顏色變體
      { type: "顏色", name: "Power Black - 力量黑", price: 420 },
      { type: "顏色", name: "Glory Red - 榮耀紅", price: 420 },
      { type: "顏色", name: "Pearl Pink - 珍珠粉", price: 420 },
      { type: "顏色", name: "Rose Gold - 玫瑰金", price: 420 },
      { type: "顏色", name: "Black Gold - 黑金", price: 420 },
      { type: "顏色", name: "Dark Gray - 深灰", price: 420 },
      { type: "顏色", name: "Starry Blue - 星空藍", price: 420 },
      { type: "顏色", name: "Dark Blue - 深藍", price: 420 },
      { type: "顏色", name: "Pine Green - 松綠", price: 420 },
      { type: "顏色", name: "Dark Brown - 深棕", price: 420 },
      { type: "顏色", name: "Black Warrior - 黑武士", price: 420 },
      { type: "顏色", name: "Coral Orange - 珊瑚橙", price: 420 },
      // 煙彈變體
      { type: "煙彈", name: "0.6歐姆（3入裝）", price: 150 },
      { type: "煙彈", name: "0.8歐姆（3入裝）", price: 150 },
      { type: "煙彈", name: "1.2歐姆（3入裝）", price: 150 },
      // 轉接頭
      { type: "配件", name: "轉接頭（適用舊版煙彈）", price: 50 }
    ])
  },
  {
    id: 2,
    name: 'OXVA XLIM PRO 2 小蠻牛PRO 2電子煙主機',
    price: 380,
    multi_discount: JSON.stringify({"2": 0.95, "3": 0.9}),
    images: JSON.stringify(["products/oxva-xlim-pro2-v2.jpg"]),
    is_active: 1,
    description: `採用了 Oxva Xlim 系列的旗艦電子煙系統，在性能、壽命和設計方面取代了先前的型號和普通電子煙套件。

🔋 核心規格：
• 電池容量：1300 mAh 大電池，經過優化
• 續航時間：可以享受四天的電子煙樂趣
• 快速充電：半小時內透過 USB Type-C 連接埠充電
• 顯示器：高像素數、0.56 吋彩色顯示器
• 操作：單手操作，消除切換和介面障礙

🎨 顏色規格（10款）：
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

🔧 原廠小蠻牛 XLIM 系列煙彈：
• 0.4Ω 煙彈
• 0.6Ω 煙彈
• 0.8Ω 煙彈

📦 產品分類：主機、煙彈

✨ 產品特色：
任何級別的電子煙使用者都可以透過其超高清介面監控自己的即時使用情況，並進行無縫調整，以形成完美的電子煙體驗。再加上令人難以置信的使用壽命，Xlim PRO 2 是追求高品質電子煙體驗用戶的完美選擇。`,
    variants: JSON.stringify([
      // 顏色變體
      { type: "顏色", name: "黑武士 Black Knight", price: 380 },
      { type: "顏色", name: "卡夢黑金 Carbon Black Gold", price: 380 },
      { type: "顏色", name: "卡夢銀 Carbon Silver", price: 380 },
      { type: "顏色", name: "夢幻紫 Dreamy Purple", price: 380 },
      { type: "顏色", name: "夢幻灰 Dreamy Grey", price: 380 },
      { type: "顏色", name: "皮革藍 Leather Blue", price: 380 },
      { type: "顏色", name: "皮革綠 Leather Green", price: 380 },
      { type: "顏色", name: "皮革粉 Leather Pink", price: 380 },
      { type: "顏色", name: "皮革棕 Leather Brown", price: 380 },
      { type: "顏色", name: "琥珀橙 Amber Orange", price: 380 },
      // 煙彈變體
      { type: "煙彈", name: "0.4Ω 煙彈", price: 120 },
      { type: "煙彈", name: "0.6Ω 煙彈", price: 120 },
      { type: "煙彈", name: "0.8Ω 煙彈", price: 120 }
    ])
  },
  {
    id: 3,
    name: 'OXVA XLIM SQ PRO 2 小蠻牛 SQ PRO 2電子煙主機',
    price: 450,
    multi_discount: JSON.stringify({"2": 0.95, "3": 0.9}),
    images: JSON.stringify(["products/oxva-xlim-sq-pro2-v2.jpg"]),
    is_active: 1,
    description: `OXVA XLIM SQ PRO 2 最新智慧電子煙主機，配備先進的觸控螢幕技術和超大電池容量。

🔋 核心規格：
• 螢幕：1.09 吋 HD 智慧觸控螢幕，支援 64 種畫面組合，操作流暢
• 電池：1600mAh 超大電池，ECO 模式下續航可達 7 天
• 功率：5–30W 輸出功率，支援 MTL/RDL 吸法
• 充電：Type-C 快充，45 分鐘內充滿電
• 氣流：側邊氣流調節（AFC），可依喜好調整吸阻

🎨 顏色規格（10款）：
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

🔧 原廠小蠻牛 XLIM 系列煙彈：
• 0.4Ω 煙彈
• 0.6Ω 煙彈
• 0.8Ω 煙彈

📦 產品分類：主機、煙彈

🛠️ 智能功能：
• 智慧吸嗨日誌，可記錄 30 天使用趨勢，5 位數計數器
• 支援 XLIM 全系列彈芯（Top Fill、V2、EZ），相容性極高
• 內建實用工具：手電筒、碼表、日曆、語言切換等

✨ 產品特色：
結合智慧科技與實用功能，為用戶提供最便利的電子煙體驗。超大螢幕和直觀操作界面，讓每次使用都更加愉悅。`,
    variants: JSON.stringify([
      // 顏色變體
      { type: "顏色", name: "Black Carbon - 碳纖黑", price: 450 },
      { type: "顏色", name: "Black Leather - 皮革黑", price: 450 },
      { type: "顏色", name: "Brown Leather - 皮革棕", price: 450 },
      { type: "顏色", name: "Gunmetal Wood - 槍灰木紋", price: 450 },
      { type: "顏色", name: "Brown Wood - 原木棕", price: 450 },
      { type: "顏色", name: "Blue Shadow - 深藍影", price: 450 },
      { type: "顏色", name: "Frost Marble - 霜雪大理石", price: 450 },
      { type: "顏色", name: "Celadon Marble - 青瓷大理石", price: 450 },
      { type: "顏色", name: "Dream Pink - 夢幻粉", price: 450 },
      { type: "顏色", name: "Dream Purple - 夢幻紫", price: 450 },
      // 煙彈變體
      { type: "煙彈", name: "0.4Ω 煙彈", price: 120 },
      { type: "煙彈", name: "0.6Ω 煙彈", price: 120 },
      { type: "煙彈", name: "0.8Ω 煙彈", price: 120 }
    ])
  },
  {
    id: 4,
    name: 'Ripe Vapes VCT Coconut 尼古丁鹽煙油',
    price: 320,
    multi_discount: JSON.stringify({"2": 0.95, "3": 0.9}),
    images: JSON.stringify(["products/ripe-vapes-vct-coconut-v2.webp"]),
    is_active: 1,
    description: `Ripe Vapes VCT Coconut 30ml 尼古丁鹽煙油，經典椰子煙草風味的完美結合，為追求經典口味的用戶帶來順滑的吸食體驗。

🌿 產品規格：
• 品牌：Ripe Vapes
• 產品名稱：VCT Coconut
• 容量：30ml
• 類型：尼古丁鹽煙油（Salt Nicotine）
• 風味：椰子煙草（Coconut Tobacco）
• VG/PG 比例：50VG/50PG

💨 尼古丁濃度選擇：
• 25mg/ml 尼古丁鹽
• 50mg/ml 尼古丁鹽

🎯 風味特色：
• 經典煙草基調：濃郁而成熟的煙草風味
• 椰子香甜：天然椰子的香甜與奶香
• 順滑口感：尼古丁鹽技術提供更順滑的喉感
• 完美平衡：煙草與椰子的黃金比例調配

📦 產品分類：煙油、尼古丁鹽

🔧 適用設備：
• MTL（嘴吸式）電子煙設備
• Pod 系統電子煙
• 低功率霧化器（建議功率：8-15W）

🏆 品牌特色：
Ripe Vapes 是美國知名的高品質煙油品牌，以其經典的 VCT（Vanilla Custard Tobacco）系列聞名全球。每瓶煙油都採用優質原料製作，經過嚴格的品質控制，確保穩定的品質和絕佳的口感體驗。

✨ 使用建議：
適合喜愛經典煙草風味但又想嘗試不同層次口感的用戶。椰子的加入為傳統煙草風味增添了熱帶風情，創造出獨特而令人難忘的吸食體驗。`,
    variants: JSON.stringify([
      // 尼古丁濃度變體
      { type: "尼古丁濃度", name: "25mg/ml 尼古丁鹽", price: 320 },
      { type: "尼古丁濃度", name: "50mg/ml 尼古丁鹽", price: 320 }
    ])
  }
];

// 檢查 variants 字段是否存在，如果不存在則添加
function ensureVariantsColumn() {
  return new Promise((resolve, reject) => {
    db.all("PRAGMA table_info(products)", (err, columns) => {
      if (err) {
        reject(err);
        return;
      }
      
      const hasVariants = columns.some(col => col.name === 'variants');
      
      if (!hasVariants) {
        console.log('⚡ 添加 variants 字段到 products 表...');
        db.run("ALTER TABLE products ADD COLUMN variants TEXT", (err) => {
          if (err) {
            reject(err);
          } else {
            console.log('✅ variants 字段添加成功');
            resolve();
          }
        });
      } else {
        console.log('✅ variants 字段已存在');
        resolve();
      }
    });
  });
}

// 插入產品
function insertProduct(product) {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO products (name, price, multi_discount, images, is_active, created_at, description, variants)
      VALUES (?, ?, ?, ?, ?, datetime('now'), ?, ?)
    `;
    
    db.run(sql, [
      product.name,
      product.price,
      product.multi_discount,
      product.images,
      product.is_active,
      product.description,
      product.variants
    ], function(err) {
      if (err) {
        reject(err);
      } else {
        console.log(`✅ 已上架產品: ${product.name}`);
        console.log(`   - 產品ID: ${this.lastID}`);
        console.log(`   - 變體數量: ${JSON.parse(product.variants).length} 個`);
        resolve(this.lastID);
      }
    });
  });
}

// 執行重新上架
async function reuploadAllProducts() {
  try {
    // 確保 variants 字段存在
    await ensureVariantsColumn();
    
    console.log('\n🏗️ 開始上架產品...\n');
    
    for (const product of products) {
      await insertProduct(product);
    }
    
    console.log('\n🎉 所有產品重新上架完成！');
    console.log('\n📋 上架摘要：');
    console.log('✅ OXVA NEXLIM 大蠻牛：12種顏色 + 3種煙彈 + 1種轉接頭 = 16個變體');
    console.log('✅ OXVA XLIM PRO 2：10種顏色 + 3種煙彈 = 13個變體');
    console.log('✅ OXVA XLIM SQ PRO 2：10種顏色 + 3種煙彈 = 13個變體');
    console.log('✅ Ripe Vapes VCT Coconut：2種尼古丁濃度 = 2個變體');
    console.log('\n🔥 總計：4個產品，44個變體規格！');
    
  } catch (error) {
    console.error('❌ 重新上架失敗:', error);
  } finally {
    db.close();
  }
}

// 執行上架
reuploadAllProducts(); 