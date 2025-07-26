#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Railway 啟動腳本開始...');

// 安裝後端依賴項
console.log('📦 檢查後端依賴項...');
try {
  const backendDir = __dirname;
  const packageJsonPath = path.join(backendDir, 'package.json');
  const nodeModulesPath = path.join(backendDir, 'node_modules');
  
  // 檢查是否需要安裝依賴項
  if (fs.existsSync(packageJsonPath) && !fs.existsSync(nodeModulesPath)) {
    console.log('🔧 安裝後端依賴項...');
    execSync('npm install --production', { cwd: backendDir, stdio: 'inherit' });
    console.log('✅ 後端依賴項安裝完成');
  } else {
    console.log('✅ 後端依賴項已存在');
  }
} catch (error) {
  console.error('❌ 後端依賴項安裝失敗:', error.message);
  // 嘗試使用 npm ci 作為備選方案
  try {
    console.log('🔄 嘗試使用 npm ci...');
    execSync('npm ci --production', { cwd: __dirname, stdio: 'inherit' });
    console.log('✅ 使用 npm ci 安裝成功');
  } catch (ciError) {
    console.error('❌ npm ci 也失敗了:', ciError.message);
    console.log('⚠️  繼續啟動，但後端可能缺少依賴項...');
  }
}

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
const isRailwayEnvironment = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID;
const dbPath = process.env.DATABASE_PATH || (isRailwayEnvironment ? '/app/data/mistmall.db' : path.join(__dirname, 'data', 'mistmall.db'));
console.log('🗄️ 數據庫路徑:', dbPath);
console.log('🌍 環境類型:', isRailwayEnvironment ? 'Railway' : 'Local');

// 確保數據庫目錄存在
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  try {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log('✅ 創建數據庫目錄:', dbDir);
  } catch (error) {
    console.error('❌ 無法創建數據庫目錄:', error.message);
    // 如果創建失敗，嘗試使用當前目錄下的 data 目錄
    const fallbackDbPath = path.join(__dirname, 'data', 'mistmall.db');
    const fallbackDbDir = path.dirname(fallbackDbPath);
    fs.mkdirSync(fallbackDbDir, { recursive: true });
    process.env.DATABASE_PATH = fallbackDbPath;
    console.log('🔄 使用備用路徑:', fallbackDbPath);
    return;
  }
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
