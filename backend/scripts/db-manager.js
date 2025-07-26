#!/usr/bin/env node

/**
 * 數據庫管理腳本
 * 用於備份、恢復、重置本地開發數據庫
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// 數據庫路徑
const dataDir = path.join(__dirname, '../data');
const prodDbPath = path.join(dataDir, 'mistmall.db');
const devDbPath = path.join(dataDir, 'mistmall_dev.db');
const backupDir = path.join(dataDir, 'backups');

// 確保目錄存在
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// 獲取當前時間戳
const getTimestamp = () => {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
};

// 備份數據庫
const backupDatabase = (sourceDb, backupName) => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(sourceDb)) {
      reject(new Error(`源數據庫不存在: ${sourceDb}`));
      return;
    }

    const timestamp = getTimestamp();
    const backupPath = path.join(backupDir, `${backupName}_${timestamp}.db`);
    
    console.log(`📦 備份數據庫: ${sourceDb} → ${backupPath}`);
    
    fs.copyFile(sourceDb, backupPath, (err) => {
      if (err) {
        reject(err);
      } else {
        console.log(`✅ 備份完成: ${backupPath}`);
        resolve(backupPath);
      }
    });
  });
};

// 恢復數據庫
const restoreDatabase = (backupPath, targetDb) => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(backupPath)) {
      reject(new Error(`備份文件不存在: ${backupPath}`));
      return;
    }

    console.log(`🔄 恢復數據庫: ${backupPath} → ${targetDb}`);
    
    fs.copyFile(backupPath, targetDb, (err) => {
      if (err) {
        reject(err);
      } else {
        console.log(`✅ 恢復完成: ${targetDb}`);
        resolve(targetDb);
      }
    });
  });
};

// 重置開發數據庫（從生產數據庫複製）
const resetDevDatabase = async () => {
  try {
    if (!fs.existsSync(prodDbPath)) {
      console.log('❌ 生產數據庫不存在，無法重置開發數據庫');
      return;
    }

    // 先備份現有的開發數據庫
    if (fs.existsSync(devDbPath)) {
      await backupDatabase(devDbPath, 'dev_backup');
    }

    // 從生產數據庫複製到開發數據庫
    await restoreDatabase(prodDbPath, devDbPath);
    console.log('🎉 開發數據庫重置完成');
  } catch (error) {
    console.error('❌ 重置開發數據庫失敗:', error.message);
  }
};

// 列出所有備份
const listBackups = () => {
  console.log('📋 可用的備份文件:');
  
  if (!fs.existsSync(backupDir)) {
    console.log('  (無備份文件)');
    return;
  }

  const backups = fs.readdirSync(backupDir)
    .filter(file => file.endsWith('.db'))
    .sort()
    .reverse();

  if (backups.length === 0) {
    console.log('  (無備份文件)');
  } else {
    backups.forEach((backup, index) => {
      const backupPath = path.join(backupDir, backup);
      const stats = fs.statSync(backupPath);
      console.log(`  ${index + 1}. ${backup} (${stats.size} bytes, ${stats.mtime.toLocaleString()})`);
    });
  }
};

// 主函數
const main = async () => {
  const command = process.argv[2];

  switch (command) {
    case 'backup-prod':
      try {
        await backupDatabase(prodDbPath, 'prod_backup');
      } catch (error) {
        console.error('❌ 備份生產數據庫失敗:', error.message);
      }
      break;

    case 'backup-dev':
      try {
        await backupDatabase(devDbPath, 'dev_backup');
      } catch (error) {
        console.error('❌ 備份開發數據庫失敗:', error.message);
      }
      break;

    case 'reset-dev':
      await resetDevDatabase();
      break;

    case 'list':
      listBackups();
      break;

    case 'restore':
      const backupFile = process.argv[3];
      const target = process.argv[4] || 'dev';
      
      if (!backupFile) {
        console.log('❌ 請指定備份文件名');
        console.log('用法: npm run db restore <備份文件名> [dev|prod]');
        break;
      }

      const backupPath = path.join(backupDir, backupFile);
      const targetPath = target === 'prod' ? prodDbPath : devDbPath;

      try {
        await restoreDatabase(backupPath, targetPath);
      } catch (error) {
        console.error('❌ 恢復數據庫失敗:', error.message);
      }
      break;

    default:
      console.log('🗄️  數據庫管理工具');
      console.log('');
      console.log('可用命令:');
      console.log('  backup-prod  - 備份生產數據庫');
      console.log('  backup-dev   - 備份開發數據庫');
      console.log('  reset-dev    - 重置開發數據庫（從生產數據庫複製）');
      console.log('  list         - 列出所有備份');
      console.log('  restore <文件名> [dev|prod] - 恢復數據庫');
      console.log('');
      console.log('用法示例:');
      console.log('  npm run db backup-dev');
      console.log('  npm run db reset-dev');
      console.log('  npm run db list');
      console.log('  npm run db restore prod_backup_2024-06-24T12-00-00.db dev');
  }
};

main().catch(console.error);
