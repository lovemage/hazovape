#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 數據庫路徑
const dbPath = path.join(__dirname, '../data/mistmall.db');
const db = new sqlite3.Database(dbPath);

console.log('🔧 開始更新 Ripe Vapes 產品規格...');

// Ripe Vapes 產品更新
const ripeVapesUpdate = {
  id: 4,
  name: 'Ripe Vapes VCT Coconut 尼古丁鹽煙油',
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
適合喜愛經典煙草風味但又想嘗試不同層次口感的用戶。椰子的加入為傳統煙草風味增添了熱帶風情，創造出獨特而令人難忘的吸食體驗。`
};

// 更新產品函數
function updateRipeVapes() {
  return new Promise((resolve, reject) => {
    const sql = `UPDATE products SET name = ?, description = ? WHERE id = ?`;
    
    db.run(sql, [ripeVapesUpdate.name, ripeVapesUpdate.description, ripeVapesUpdate.id], function(err) {
      if (err) {
        reject(err);
      } else {
        console.log(`✅ 已更新 Ripe Vapes 產品規格`);
        resolve();
      }
    });
  });
}

// 執行更新
async function updateProduct() {
  try {
    await updateRipeVapes();
    
    console.log('\n🎉 Ripe Vapes 產品規格更新完成！');
    console.log('\n📋 更新內容：');
    console.log('• 完整的產品規格信息');
    console.log('• 25mg/50mg 尼古丁濃度選擇');
    console.log('• 詳細的風味特色描述');
    console.log('• 適用設備和使用建議');
    console.log('• 品牌背景介紹');
    
  } catch (error) {
    console.error('❌ 更新失敗:', error);
  } finally {
    db.close();
  }
}

// 執行更新
updateProduct(); 