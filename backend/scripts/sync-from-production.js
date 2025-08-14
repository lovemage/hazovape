#!/usr/bin/env node

const https = require('https');
const fs = require('fs').promises;
const Database = require('../config/database');

const PRODUCTION_URL = 'https://vjvape.com';

async function fetchFromAPI(endpoint) {
  return new Promise((resolve, reject) => {
    https.get(`${PRODUCTION_URL}${endpoint}`, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(new Error(`無法解析 JSON: ${error.message}`));
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

async function syncProductsFromProduction() {
  try {
    console.log('📦 從生產環境同步商品資料...');
    
    const products = await fetchFromAPI('/api/products');
    console.log(`✅ 獲取到 ${products.length} 個商品`);
    
    // 保存到本地檔案作為備份
    const backupFile = `production-products-${new Date().toISOString().split('T')[0]}.json`;
    await fs.writeFile(backupFile, JSON.stringify(products, null, 2));
    console.log(`💾 已保存商品備份到: ${backupFile}`);
    
    // 可選：同步到本地數據庫（需要謹慎處理）
    console.log('⚠️  注意：同步到本地數據庫需要謹慎操作，避免覆蓋重要數據');
    
    return products;
    
  } catch (error) {
    console.error('❌ 同步商品失敗:', error);
    throw error;
  }
}

async function syncSettingsFromProduction() {
  try {
    console.log('⚙️  從生產環境同步設定資料...');
    
    const settings = await fetchFromAPI('/api/settings');
    console.log('✅ 獲取到設定:', Object.keys(settings).length, '個');
    
    // 保存到本地檔案
    const backupFile = `production-settings-${new Date().toISOString().split('T')[0]}.json`;
    await fs.writeFile(backupFile, JSON.stringify(settings, null, 2));
    console.log(`💾 已保存設定備份到: ${backupFile}`);
    
    return settings;
    
  } catch (error) {
    console.error('❌ 同步設定失敗:', error);
    throw error;
  }
}

async function checkProductionStatus() {
  try {
    console.log('🔍 檢查生產環境狀態...');
    
    // 檢查商品
    const products = await syncProductsFromProduction();
    
    // 檢查設定
    const settings = await syncSettingsFromProduction();
    
    console.log('\n📊 生產環境摘要:');
    console.log(`📦 商品數量: ${products.length}`);
    console.log(`⚙️  設定項目: ${Object.keys(settings).length}`);
    console.log(`🚛 免運門檻: NT$ ${settings.free_shipping_threshold || '未設定'}`);
    console.log(`📫 運費: NT$ ${settings.shipping_fee || '未設定'}`);
    
    // 統計商品分類
    const categories = {};
    products.forEach(product => {
      const category = product.category || '未分類';
      categories[category] = (categories[category] || 0) + 1;
    });
    
    console.log('\n📋 商品分類統計:');
    Object.entries(categories)
      .sort(([,a], [,b]) => b - a)
      .forEach(([category, count]) => {
        console.log(`  ${category}: ${count} 個商品`);
      });
      
    return { products, settings };
    
  } catch (error) {
    console.error('❌ 檢查生產環境失敗:', error);
    throw error;
  }
}

// 如果直接執行此腳本
if (require.main === module) {
  checkProductionStatus().then(() => {
    console.log('\n✅ 生產環境狀態檢查完成');
    console.log('💡 備份檔案已保存在當前目錄');
    process.exit(0);
  }).catch(error => {
    console.error('❌ 腳本執行失敗:', error);
    process.exit(1);
  });
}

module.exports = { checkProductionStatus, syncProductsFromProduction, syncSettingsFromProduction };