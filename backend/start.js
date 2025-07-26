#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

const dbPath = process.env.DATABASE_PATH || 
  (process.env.NODE_ENV === 'production' ? 
    '/app/data/mistmall.db' : 
    path.join(__dirname, 'data', 'mistmall.db')
  );

console.log('🔍 檢查數據庫文件:', dbPath);
console.log('📄 數據庫文件存在:', fs.existsSync(dbPath));

if (process.env.NODE_ENV === 'production') {
  console.log('🌍 環境: production');
  
  // 檢查數據庫是否需要初始化
  const needsInit = !fs.existsSync(dbPath) || fs.statSync(dbPath).size < 1024;
  
  if (needsInit) {
    console.log('🔧 數據庫需要初始化...');
    require('./scripts/init-production-db');
  } else {
    console.log('📋 數據庫文件存在且有數據，跳過初始化');
    console.log('✅ 數據庫已存在，直接啟動服務器');
    
    // 確保靜態文件正確配置
    const ensureStaticFiles = require('./scripts/ensure-static-files');
    ensureStaticFiles().then(() => {
      console.log('✅ 靜態文件檢查完成');
    }).catch(error => {
      console.error('❌ 靜態文件檢查失敗:', error);
    });
    
    // 直接啟動服務器
    console.log('🚀 直接啟動服務器，跳過數據庫檢查');
    require('./server');
  }
} else {
  console.log('🌍 環境: development');
  
  // 開發環境：簡單檢查後啟動
  if (!fs.existsSync(dbPath)) {
    console.log('🔧 開發環境數據庫不存在，需要初始化');
    console.log('請運行: npm run init-db');
    process.exit(1);
  }
  
  console.log('✅ 開發環境啟動服務器');
  require('./server');
}
