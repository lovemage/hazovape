const fs = require('fs');
const path = require('path');

// 所有產品的txt檔案路徑 (相對於中央廚房2目錄)
const productFiles = [
  './APX S1/APX.txt',
  './BLVK彩虹小馬/彩虹小馬.txt',
  './ELFBAR ELF X PRO/ELFBAR ELF X PRO.txt',
  './ELFX一般版/ELFBAR ELF X.txt',
  './OXVA NEXLIM 大蠻牛/OXVA NEXLIM 大蠻牛.txt',
  './OXVA ONEO/ONEO.txt',
  './OXVA XLIM PRO 2/OXVA XLIM PRO 2.txt',
  './OXVA XLIM SQ PRO 2/XLIM SQ PRO 2.txt',
  './Ripe Vapes生命樹/生命樹.txt',
  './SLAPPLE口香糖/口香糖.txt',
  './SLAPPLE涼版/SLAPPLE涼版.txt',
  './geek bar/geekbar.txt',
  './泰國MARBO/泰國marbo.txt',
  './tisic/tisic.txt',
  './冰山系列/冰山系列.txt',
  './味覺達人/味覺達人.txt',
  './東京魔盒/東京魔盒.txt',
  './極地/極地.txt',
  './純粹果物/純粹果物.txt',
  './自拍星期天/自拍星期天.txt',
  './領帶/領帶.txt',
  './黑騎士/黑騎士.txt',
  './飛利浦老咖啡/Phillip rocke 老咖啡.txt'
];

function parseProductFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    
    let product = {
      name: '',
      category: '',
      prices: {},
      description: '',
      specs: [],
      filePath: filePath
    };
    
    let currentSection = '';
    let descriptionLines = [];
    
    for (let line of lines) {
      if (line.includes('產品名稱：')) {
        product.name = line.replace('產品名稱：', '').trim();
      } else if (line.includes('產品分類：')) {
        product.category = line.replace('產品分類：', '').trim();
      } else if (line.includes('產品價格：')) {
        currentSection = 'price';
        continue;
      } else if (line.includes('產品規格：')) {
        currentSection = 'specs';
        continue;
      } else if (line.includes('產品簡介：') || line.includes('產品介紹：')) {
        currentSection = 'description';
        continue;
      }
      
      if (currentSection === 'price') {
        if (line.includes('主機') && line.match(/\d+/)) {
          product.prices.主機 = parseInt(line.match(/\d+/)[0]);
        } else if (line.includes('煙彈') || line.includes('煙蛋')) {
          const price = line.match(/\d+/);
          if (price) product.prices.煙彈 = parseInt(price[0]);
        } else if (line.match(/^\d+$/)) {
          product.prices.統一價格 = parseInt(line);
        }
      } else if (currentSection === 'specs') {
        if (line && !line.includes('：') && !line.includes('產品')) {
          // 這是一個規格項目
          const spec = line.replace(/：$/, '').trim();
          if (spec && spec !== 'specs') {
            product.specs.push(spec);
          }
        }
      } else if (currentSection === 'description') {
        if (line && !line.includes('格式') && !line.includes('產品')) {
          descriptionLines.push(line);
        }
      }
    }
    
    product.description = descriptionLines.join(' ').trim();
    
    return product;
  } catch (error) {
    console.error(`處理檔案 ${filePath} 時出錯:`, error.message);
    return null;
  }
}

function generateProductImportData(products) {
  let importData = [];
  let flavorData = [];
  
  for (let product of products) {
    if (!product) continue;
    
    console.log(`\n處理產品: ${product.name}`);
    console.log(`分類: ${product.category}`);
    console.log(`價格:`, product.prices);
    console.log(`規格數量: ${product.specs.length}`);
    
    // 生成產品導入數據
    if (product.prices.主機) {
      // 主機類產品 - 創建主機和煙彈兩個產品
      importData.push({
        name: product.name,
        category: product.category,
        price: product.prices.主機,
        description: product.description,
        specs: product.specs.filter(spec => !spec.includes('歐姆') && !spec.includes('入'))
      });
      
      if (product.prices.煙彈) {
        const cartridgeName = product.name.includes('煙彈') ? product.name : `${product.name} 煙彈`;
        importData.push({
          name: cartridgeName,
          category: product.category,
          price: product.prices.煙彈,
          description: `適用於${product.name}的煙彈`,
          specs: product.specs.filter(spec => spec.includes('歐姆') || spec.includes('入'))
        });
      }
    } else if (product.prices.統一價格) {
      // 統一價格產品
      importData.push({
        name: product.name,
        category: product.category,
        price: product.prices.統一價格,
        description: product.description,
        specs: product.specs
      });
    }
  }
  
  return importData;
}

function generateBatchImportText(products) {
  let output = [];
  
  output.push('# TXT產品批量導入模板');
  output.push('#');
  output.push('# 格式說明:');
  output.push('# 1. 每個產品之間用 "---" 分隔');
  output.push('# 2. 每行格式: 字段名: 值 (冒號後要有空格)');
  output.push('# 3. 必填字段: 名稱、價格');
  output.push('# 4. 可選字段: 庫存、分類、描述、多件優惠、是否啟用');
  output.push('# 5. 文件編碼: UTF-8');
  output.push('#');
  output.push('# 可用分類: 一次性拋棄式電子煙、注油式主機與耗材、拋棄式通用煙蛋系列、小煙油系列、其他產品');
  output.push('#');
  output.push('# ==================== 產品清單開始 ====================');
  output.push('');
  
  for (let product of products) {
    output.push(`名稱: ${product.name}`);
    output.push(`價格: ${product.price}`);
    output.push(`分類: ${product.category}`);
    if (product.description) {
      output.push(`描述: ${product.description.substring(0, 200)}${product.description.length > 200 ? '...' : ''}`);
    }
    output.push(`是否啟用: true`);
    output.push('---');
  }
  
  return output.join('\n');
}

function generateFlavorImportText(products) {
  let output = [];
  
  output.push('# TXT規格批量導入模板');
  output.push('#');
  output.push('# 格式說明:');
  output.push('# 產品名稱：[產品名稱]');
  output.push('# 規格：');
  output.push('# [規格名稱1]：[價格]');
  output.push('# [規格名稱2]：[價格]');
  output.push('# ---');
  output.push('#');
  output.push('# ==================== 規格清單開始 ====================');
  output.push('');
  
  for (let product of products) {
    if (product.specs && product.specs.length > 0) {
      output.push(`產品名稱：${product.name}`);
      output.push('規格：');
      
      for (let spec of product.specs) {
        // 如果是統一價格產品，所有規格使用相同價格
        // 如果是主機類產品，需要區分主機規格和煙彈規格
        output.push(`${spec}：${product.price}`);
      }
      
      output.push('---');
      output.push('');
    }
  }
  
  return output.join('\n');
}

// 主程序
console.log('🚀 開始處理中央廚房2產品資料...\n');

const products = [];
let successCount = 0;
let errorCount = 0;

for (let filePath of productFiles) {
  const product = parseProductFile(filePath);
  if (product) {
    products.push(product);
    successCount++;
  } else {
    errorCount++;
  }
}

console.log(`\n📊 處理結果:`);
console.log(`✅ 成功處理: ${successCount} 個產品`);
console.log(`❌ 處理失敗: ${errorCount} 個產品`);

// 生成批量導入數據
const importProducts = generateProductImportData(products);
console.log(`\n📦 生成產品數據: ${importProducts.length} 個產品`);

// 生成產品批量導入檔案
const productImportText = generateBatchImportText(importProducts);
fs.writeFileSync('./自動生成_產品批量導入.txt', productImportText, 'utf8');

// 生成規格批量導入檔案
const flavorImportText = generateFlavorImportText(importProducts);
fs.writeFileSync('./自動生成_規格批量導入.txt', flavorImportText, 'utf8');

console.log('\n🎉 批量上架檔案已生成:');
console.log('📄 ./自動生成_產品批量導入.txt');
console.log('📄 ./自動生成_規格批量導入.txt');

console.log('\n🔧 使用方法:');
console.log('1. 先導入產品: 在admin後台上傳 "自動生成_產品批量導入.txt"');
console.log('2. 再導入規格: 在規格管理頁面上傳 "自動生成_規格批量導入.txt"');
console.log('3. 手動上傳產品圖片到對應產品');

// 顯示產品摘要
console.log('\n📋 產品摘要:');
for (let product of importProducts) {
  console.log(`• ${product.name} - NT$ ${product.price} (${product.category})`);
} 