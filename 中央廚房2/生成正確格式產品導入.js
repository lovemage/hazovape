const fs = require('fs');

// 從現有檔案讀取產品數據
const existingFile = './完整_產品批量導入.txt';
const content = fs.readFileSync(existingFile, 'utf8');

// 解析現有產品數據
const lines = content.split('\n');
let products = [];
let currentProduct = {};

for (let line of lines) {
  line = line.trim();
  
  if (line.startsWith('#') || !line) {
    continue;
  }
  
  if (line === '---') {
    if (currentProduct.name && currentProduct.price) {
      products.push(currentProduct);
    }
    currentProduct = {};
    continue;
  }
  
  if (line.includes('名稱:')) {
    currentProduct.name = line.split(':')[1].trim();
  } else if (line.includes('價格:')) {
    currentProduct.price = line.split(':')[1].trim();
  } else if (line.includes('分類:')) {
    currentProduct.category = line.split(':')[1].trim();
  } else if (line.includes('描述:')) {
    currentProduct.description = line.split(':')[1].trim();
  } else if (line.includes('是否啟用:')) {
    currentProduct.is_active = line.split(':')[1].trim();
  }
}

// 生成正確格式的批量導入檔案
function generateCorrectBatchImportFile(products) {
  let output = [];
  
  output.push('# TXT產品批量導入模板');
  output.push('#');
  output.push('# 格式說明:');
  output.push('# 1. 每個產品之間用 "---" 分隔');
  output.push('# 2. 每行格式: 字段名: 值 (冒號後要有空格)');
  output.push('# 3. 必填字段: 名稱、價格');
  output.push('# 4. 可選字段: 分類、描述、多件優惠、是否啟用');
  output.push('# 5. 文件編碼: UTF-8');
  output.push('# 6. 注意：庫存由規格管理，產品表不存儲庫存');
  output.push('#');
  output.push('# 可用分類: 一次性拋棄式電子煙、注油式主機與耗材、拋棄式通用煙蛋系列、小煙油系列、其他產品');
  output.push('#');
  output.push('# ==================== 產品清單開始 ====================');
  output.push('');
  
  for (let product of products) {
    output.push(`名稱: ${product.name}`);
    output.push(`價格: ${product.price}`);
    if (product.category) {
      output.push(`分類: ${product.category}`);
    }
    if (product.description) {
      // 限制描述長度，避免過長
      const desc = product.description.length > 150 ? 
        product.description.substring(0, 150) + '...' : 
        product.description;
      output.push(`描述: ${desc}`);
    }
    output.push(`是否啟用: ${product.is_active || 'true'}`);
    output.push('---');
  }
  
  return output.join('\n');
}

// 生成正確格式檔案
const correctContent = generateCorrectBatchImportFile(products);
fs.writeFileSync('./正確格式_產品批量導入.txt', correctContent, 'utf8');

console.log('🎉 正確格式產品批量導入檔案已生成！');
console.log(`📄 ./正確格式_產品批量導入.txt`);
console.log(`📊 共處理 ${products.length} 個產品`);
console.log('');
console.log('✅ 修正內容:');
console.log('- 移除庫存欄位 (由規格管理)');
console.log('- 優化描述長度');
console.log('- 確保格式符合後端要求');

// 顯示前5個產品預覽
console.log('\n📋 產品預覽 (前5個):');
products.slice(0, 5).forEach((product, index) => {
  console.log(`${index + 1}. ${product.name} - NT$ ${product.price} (${product.category || '未分類'})`);
}); 