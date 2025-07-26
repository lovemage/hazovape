#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Railway 啟動腳本開始...');

// 確保必要的目錄存在
const dirs = ['data', 'uploads', 'exports'];
dirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✅ 創建目錄: ${dir}`);
  }
});

// 設置數據庫路徑
const dbPath = process.env.DATABASE_PATH || '/app/data/mistmall.db';
console.log('🗄️ 數據庫路徑:', dbPath);

// 確保數據庫目錄存在
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log('✅ 創建數據庫目錄:', dbDir);
}

// 設置環境變量
process.env.DATABASE_PATH = dbPath;
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

console.log('🌍 環境:', process.env.NODE_ENV);
console.log('📄 數據庫文件存在:', fs.existsSync(dbPath));

// 運行數據庫遷移
async function runMigrations() {
  console.log('🔧 開始運行數據庫遷移...');
  
  try {
    // 運行tracking_number遷移
    const migrateTrackingNumber = require('./scripts/migrate-add-tracking-number');
    await migrateTrackingNumber();
    console.log('✅ tracking_number 遷移完成');
  } catch (error) {
    console.error('❌ 遷移失敗:', error);
    // 不要退出，因為可能是字段已存在
    console.log('⚠️  遷移失敗，但繼續啟動服務器...');
  }
}

// 異步啟動函數
async function start() {
  try {
    // 先運行遷移
    await runMigrations();
    
    // 然後啟動服務器
    console.log('🚀 啟動服務器...');
    require('./server.js');
  } catch (error) {
    console.error('❌ 啟動失敗:', error);
    process.exit(1);
  }
}

// 啟動應用
start();
