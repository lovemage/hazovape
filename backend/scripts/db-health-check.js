#!/usr/bin/env node

/**
 * 數據庫健康檢查和自動恢復腳本
 */

const fs = require('fs');
const path = require('path');
const Database = require('../config/database');

// 數據庫健康檢查
const checkDatabaseHealth = async () => {
  try {
    console.log('🔍 開始數據庫健康檢查...');
    
    // 檢查基本表是否存在
    const tables = ['products', 'flavors', 'orders', 'order_items', 'announcements'];
    const missingTables = [];
    
    for (const table of tables) {
      try {
        await Database.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`);
        const result = await Database.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`);
        if (!result) {
          missingTables.push(table);
        }
      } catch (error) {
        missingTables.push(table);
      }
    }
    
    if (missingTables.length > 0) {
      console.log('❌ 缺少數據表:', missingTables);
      return false;
    }
    
    // 檢查數據完整性
    const checks = [
      { table: 'products', expected: 3 },
      { table: 'flavors', expected: 15 },
      { table: 'announcements', expected: 2 }
    ];
    
    for (const check of checks) {
      const result = await Database.get(`SELECT COUNT(*) as count FROM ${check.table}`);
      console.log(`📊 ${check.table}: ${result.count} 條記錄`);
      
      if (result.count < check.expected) {
        console.log(`⚠️  ${check.table} 數據不足，期望至少 ${check.expected} 條`);
      }
    }
    
    console.log('✅ 數據庫健康檢查完成');
    return true;
    
  } catch (error) {
    console.error('❌ 數據庫健康檢查失敗:', error);
    return false;
  }
};

// 自動恢復數據庫
const autoRecoverDatabase = async () => {
  try {
    console.log('🔄 開始自動恢復數據庫...');
    
    const dbPath = process.env.NODE_ENV === 'production' 
      ? '/app/data/mistmall.db'
      : path.join(__dirname, '../data/mistmall.db');
    
    const backupDir = path.join(path.dirname(dbPath), 'backups');
    
    if (!fs.existsSync(backupDir)) {
      console.log('❌ 沒有找到備份目錄');
      return false;
    }
    
    // 查找最新的備份
    const backups = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('mistmall_backup_') && file.endsWith('.db'))
      .map(file => ({
        name: file,
        path: path.join(backupDir, file),
        mtime: fs.statSync(path.join(backupDir, file)).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime);
    
    if (backups.length === 0) {
      console.log('❌ 沒有找到可用的備份文件');
      return false;
    }
    
    const latestBackup = backups[0];
    console.log('📦 找到最新備份:', latestBackup.name);
    
    // 備份當前損壞的數據庫
    if (fs.existsSync(dbPath)) {
      const corruptedPath = dbPath + '.corrupted.' + Date.now();
      fs.copyFileSync(dbPath, corruptedPath);
      console.log('💾 已備份損壞的數據庫:', corruptedPath);
    }
    
    // 恢復備份
    fs.copyFileSync(latestBackup.path, dbPath);
    console.log('✅ 數據庫恢復完成');
    
    // 驗證恢復結果
    const isHealthy = await checkDatabaseHealth();
    if (isHealthy) {
      console.log('🎉 數據庫恢復成功並通過健康檢查');
      return true;
    } else {
      console.log('❌ 數據庫恢復後仍有問題');
      return false;
    }
    
  } catch (error) {
    console.error('❌ 自動恢復失敗:', error);
    return false;
  }
};

// 主函數
const main = async () => {
  const isHealthy = await checkDatabaseHealth();
  
  if (!isHealthy) {
    console.log('🚨 數據庫健康檢查失敗，嘗試自動恢復...');
    const recovered = await autoRecoverDatabase();
    
    if (!recovered) {
      console.log('❌ 自動恢復失敗，需要手動處理');
      process.exit(1);
    }
  }
  
  console.log('✅ 數據庫狀態正常');
};

// 如果直接運行此腳本
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 健康檢查腳本執行失敗:', error);
    process.exit(1);
  });
}

module.exports = { checkDatabaseHealth, autoRecoverDatabase };
