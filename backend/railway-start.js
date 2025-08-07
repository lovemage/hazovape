#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Railway 啟動腳本開始...');

// 檢查後端依賴項 (Railway 已在 build 階段安裝)
console.log('📦 檢查後端依賴項...');
const backendDir = __dirname;
const nodeModulesPath = path.join(backendDir, 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
  console.log('✅ 後端依賴項已存在');
} else {
  console.log('⚠️  後端依賴項不存在，但在Railway環境中會在build階段安裝');
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

// 檢測是否為本地開發環境
const isLocalDevelopment = !process.env.RAILWAY_ENVIRONMENT && !process.env.PORT && process.platform !== 'linux';

// 只在非本地環境設置為 production
if (!isLocalDevelopment) {
  process.env.NODE_ENV = process.env.NODE_ENV || 'production';
} else {
  process.env.NODE_ENV = process.env.NODE_ENV || 'development';
}

console.log('🌍 環境:', process.env.NODE_ENV);
console.log('📄 數據庫文件存在:', fs.existsSync(dbPath));

// 數據庫初始化和遷移 (簡化版)
async function initializeDatabase() {
  console.log('🔧 開始數據庫初始化...');
  
  const dbExists = fs.existsSync(dbPath);
  
  if (!dbExists) {
    console.log('📋 首次部署，運行基本初始化...');
    
    try {
      // 基本的 SQL 初始化
      const Database = require('./config/database');
      const sqlPath = path.join(__dirname, 'database.sql');
      
      if (fs.existsSync(sqlPath)) {
        const sqlScript = fs.readFileSync(sqlPath, 'utf8');
        const statements = sqlScript
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0);
        
        for (const statement of statements) {
          if (statement.trim()) {
            try {
              await Database.run(statement);
              console.log('✅ 執行 SQL:', statement.substring(0, 30) + '...');
            } catch (error) {
              if (!error.message.includes('already exists')) {
                console.error('❌ SQL 執行失敗:', error.message);
              }
            }
          }
        }
        console.log('✅ 基本數據庫初始化完成');
      }
    } catch (error) {
      console.error('❌ 基本初始化失敗:', error);
      console.log('⚠️  嘗試繼續啟動...');
    }
  } else {
    console.log('📋 數據庫文件已存在，跳過初始化');
  }
  
  // 簡化的關鍵遷移 (僅必要項目)
  try {
    console.log('🔄 運行關鍵遷移...');
    
    // 只運行最關鍵的遷移
    const addTelegramSettings = require('./scripts/add-telegram-settings');
    await addTelegramSettings();
    
    const addProductDescription = require('./scripts/migrate-add-product-description');
    await addProductDescription();
    
    console.log('✅ 關鍵遷移完成');
  } catch (error) {
    console.error('❌ 遷移失敗:', error.message);
    console.log('⚠️  遷移失敗，但繼續啟動服務器...');
  }
}

// 異步啟動函數
async function start() {
  try {
    // 設置啟動超時，避免無限等待
    const startTimeout = setTimeout(() => {
      console.log('⚠️  啟動超時，直接啟動服務器...');
      require('./server.js');
    }, 30000); // 30秒超時
    
    // 先初始化數據庫，再運行遷移
    await initializeDatabase();
    
    // 清除超時
    clearTimeout(startTimeout);
    
    // 然後啟動服務器
    console.log('🚀 啟動服務器...');
    require('./server.js');
  } catch (error) {
    console.error('❌ 啟動失敗:', error);
    console.log('⚠️  嘗試直接啟動服務器...');
    require('./server.js');
  }
}

// 啟動應用
start();
