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

// 數據庫初始化和遷移
async function initializeDatabase() {
  console.log('🔧 開始數據庫初始化和遷移...');
  
  const dbExists = fs.existsSync(dbPath);
  
  if (!dbExists) {
    console.log('⚠️  數據庫文件不存在於路徑:', dbPath);
    console.log('🔍 這可能是首次部署，或者是數據庫路徑變更');
    
    // 在生產環境中更謹慎的處理
    if (isRailwayEnvironment) {
      console.log('🚨 生產環境檢測到數據庫文件不存在！');
      console.log('💡 如果這是意外情況，請立即檢查數據庫備份');
      
      // 等待一下讓用戶看到警告
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    try {
      // 運行完整的數據庫初始化
      console.log('🚀 運行數據庫初始化（保留現有數據）...');
      const completeInit = require('./scripts/complete-init');
      await completeInit();
      console.log('✅ 數據庫初始化完成');
    } catch (error) {
      console.error('❌ 數據庫初始化失敗:', error);
      console.log('⚠️  嘗試基本初始化...');
      
      try {
        // 嘗試基本的 SQL 初始化
        const Database = require('./config/database');
        const fs = require('fs');
        const path = require('path');
        
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
                console.log('✅ 執行 SQL:', statement.substring(0, 50) + '...');
              } catch (error) {
                if (!error.message.includes('already exists')) {
                  console.error('❌ SQL 執行失敗:', error.message);
                }
              }
            }
          }
          console.log('✅ 基本 SQL 初始化完成');
        }
      } catch (sqlError) {
        console.error('❌ 基本初始化也失敗:', sqlError);
      }
    }
  } else {
    console.log('✅ 數據庫文件已存在，跳過初始化');
    console.log('📁 數據庫路徑:', dbPath);
    
    // 檢查數據庫文件大小
    try {
      const stats = fs.statSync(dbPath);
      console.log('📊 數據庫文件大小:', Math.round(stats.size / 1024), 'KB');
    } catch (error) {
      console.log('⚠️  無法獲取數據庫文件資訊');
    }
  }
  
  // 運行遷移（表結構應該已經存在）
  try {
    console.log('🔄 運行數據庫遷移...');
    
    // 添加 system_settings 表和 Telegram 設置
    console.log('🔄 檢查系統設置功能...');
    const addTelegramSettings = require('./scripts/add-telegram-settings');
    await addTelegramSettings();
    console.log('✅ 系統設置功能遷移完成');
    
    // 添加 products 表的 description 字段
    console.log('🔄 檢查商品描述功能...');
    const addProductDescription = require('./scripts/migrate-add-product-description');
    await addProductDescription();
    console.log('✅ 商品描述功能遷移完成');

    // 添加產品分類字段
    console.log('🔄 檢查產品分類功能...');
    const addProductCategory = require('./scripts/migrate-add-product-category');
    await addProductCategory();
    console.log('✅ 產品分類功能遷移完成');

    // 添加產品分類管理表
    console.log('🔄 檢查產品分類管理表...');
    const addProductCategoriesTable = require('./scripts/migrate-add-product-categories-table');
    await addProductCategoriesTable();
    console.log('✅ 產品分類管理表遷移完成');

    // 添加 tracking_number 字段
    const migrateTrackingNumber = require('./scripts/migrate-add-tracking-number');
    await migrateTrackingNumber();
    console.log('✅ tracking_number 遷移完成');
    
    // 添加 upsell_products 表和功能
    console.log('🔄 檢查加購商品功能...');
    const addUpsellProducts = require('./scripts/add-upsell-products');
    await addUpsellProducts();
    
    // 清理範例商品
    console.log('🧹 清理加購商品範例數據...');
    const cleanUpsellSamples = require('./scripts/clean-upsell-samples');
    await cleanUpsellSamples();
    
    console.log('✅ 加購商品功能遷移完成');
    
    // 添加規格價格欄位
    console.log('🔄 檢查規格價格功能...');
    const { addFlavorPriceColumn } = require('./scripts/migrate-add-flavor-price');
    await addFlavorPriceColumn();
    console.log('✅ 規格價格功能遷移完成');
    
    // 更新電子煙規格分類
    console.log('🔄 檢查電子煙規格分類...');
    const { updateVapeFlavorCategories } = require('./scripts/migrate-update-vape-flavor-categories');
    await updateVapeFlavorCategories();
    console.log('✅ 電子煙規格分類更新完成');
    
    // 初始化門市數據
    console.log('🔄 檢查門市數據...');
    await initializeStores();
    console.log('✅ 門市數據檢查完成');
    
  } catch (error) {
    console.error('❌ 遷移失敗:', error.message);
    console.log('⚠️  遷移失敗，但繼續啟動服務器...');
  }
}

// 初始化門市數據
async function initializeStores() {
  try {
    console.log('🏪 檢查門市數據...');
    
    const Database = require('./config/database');
    
    // 檢查stores表是否存在且有數據
    try {
      const storeCount = await Database.get('SELECT COUNT(*) as count FROM stores');
      if (storeCount.count === 0) {
        console.log('📦 門市數據為空，開始導入...');
        const importScriptPath = path.join(__dirname, 'scripts', 'import-711-stores.js');
        console.log('🔍 檢查導入腳本路徑:', importScriptPath);
        if (fs.existsSync(importScriptPath)) {
          try {
            const { import711Stores } = require(importScriptPath);
            await import711Stores();
            console.log('✅ 門市數據導入完成');
          } catch (importError) {
            console.error('❌ 門市數據導入失敗:', importError.message);
            console.log('⚠️ 系統將繼續運行，但門市選擇功能可能無法正常使用');
          }
        } else {
          console.log('⚠️ 門市導入腳本不存在於路徑:', importScriptPath);
        }
      } else {
        console.log(`✅ 門市數據已存在，共 ${storeCount.count} 個門市`);
      }
    } catch (tableError) {
      console.log('📋 stores表不存在，創建並導入數據...');
      console.log('❌ SQL 查詢失敗:', tableError.message);
      const importScriptPath = path.join(__dirname, 'scripts', 'import-711-stores.js');
      console.log('🔍 檢查導入腳本路徑:', importScriptPath);
      if (fs.existsSync(importScriptPath)) {
        try {
          const { import711Stores } = require(importScriptPath);
          await import711Stores();
          console.log('✅ 門市數據導入完成');
        } catch (importError) {
          console.error('❌ 門市數據導入失敗:', importError.message);
          console.log('⚠️ 系統將繼續運行，但門市選擇功能可能無法正常使用');
        }
      } else {
        console.log('⚠️ 門市導入腳本不存在於路徑:', importScriptPath);
      }
    }
  } catch (error) {
    console.error('❌ 門市數據初始化失敗:', error);
  }
}

// 異步啟動函數
async function start() {
  try {
    // 先初始化數據庫，再運行遷移
    await initializeDatabase();
    
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
