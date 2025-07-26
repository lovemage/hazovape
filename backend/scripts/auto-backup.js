#!/usr/bin/env node

/**
 * 自動備份腳本
 * 在 Railway 部署前自動備份數據庫
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// 配置
const BACKUP_WEBHOOK_URL = process.env.BACKUP_WEBHOOK_URL;
const DB_PATH = process.env.NODE_ENV === 'production' 
  ? '/app/data/mistmall.db'
  : path.join(__dirname, '../data/mistmall.db');

// 獲取當前時間戳
const getTimestamp = () => {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
};

// 創建數據庫備份
const createBackup = async () => {
  try {
    if (!fs.existsSync(DB_PATH)) {
      console.log('⚠️  數據庫文件不存在，跳過備份');
      return null;
    }

    const timestamp = getTimestamp();
    const backupDir = path.join(path.dirname(DB_PATH), 'backups');
    
    // 確保備份目錄存在
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const backupPath = path.join(backupDir, `mistmall_backup_${timestamp}.db`);
    
    // 複製數據庫文件
    fs.copyFileSync(DB_PATH, backupPath);
    
    console.log('✅ 數據庫備份成功:', backupPath);
    
    // 檢查備份文件大小
    const stats = fs.statSync(backupPath);
    console.log('📊 備份文件大小:', Math.round(stats.size / 1024), 'KB');
    
    return {
      path: backupPath,
      size: stats.size,
      timestamp: timestamp
    };
  } catch (error) {
    console.error('❌ 創建備份失敗:', error);
    return null;
  }
};

// 清理舊備份（保留最近 10 個）
const cleanupOldBackups = () => {
  try {
    const backupDir = path.join(path.dirname(DB_PATH), 'backups');
    
    if (!fs.existsSync(backupDir)) {
      return;
    }

    const backups = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('mistmall_backup_') && file.endsWith('.db'))
      .map(file => ({
        name: file,
        path: path.join(backupDir, file),
        mtime: fs.statSync(path.join(backupDir, file)).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime);

    // 保留最近 10 個備份
    const toDelete = backups.slice(10);
    
    toDelete.forEach(backup => {
      fs.unlinkSync(backup.path);
      console.log('🗑️  刪除舊備份:', backup.name);
    });

    if (toDelete.length > 0) {
      console.log(`✅ 清理完成，刪除了 ${toDelete.length} 個舊備份`);
    }
  } catch (error) {
    console.error('❌ 清理舊備份失敗:', error);
  }
};

// 發送備份通知（可選）
const sendBackupNotification = (backupInfo) => {
  if (!BACKUP_WEBHOOK_URL || !backupInfo) {
    return;
  }

  const message = {
    text: `🗄️ 數據庫自動備份完成\n` +
          `📅 時間: ${backupInfo.timestamp}\n` +
          `📊 大小: ${Math.round(backupInfo.size / 1024)} KB\n` +
          `🚀 準備部署新版本`
  };

  // 這裡可以發送到 Slack、Discord 或其他通知服務
  console.log('📢 備份通知:', message.text);
};

// 主函數
const main = async () => {
  console.log('🔄 開始自動備份流程...');
  
  // 創建備份
  const backupInfo = await createBackup();
  
  if (backupInfo) {
    // 清理舊備份
    cleanupOldBackups();
    
    // 發送通知
    sendBackupNotification(backupInfo);
    
    console.log('✅ 自動備份流程完成');
  } else {
    console.log('⚠️  備份流程跳過');
  }
};

// 如果直接運行此腳本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { createBackup, cleanupOldBackups };
