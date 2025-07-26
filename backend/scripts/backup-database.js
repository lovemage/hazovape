#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Railway Volume 數據庫備份腳本
 * 用於備份生產環境的數據庫文件
 */

const dbPath = process.env.NODE_ENV === 'production'
  ? '/app/data/mistmall.db'
  : path.join(__dirname, '../data/mistmall.db');

const backupDir = process.env.NODE_ENV === 'production'
  ? '/app/data/backups'
  : path.join(__dirname, '../data/backups');

// 確保備份目錄存在
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// 生成備份文件名（包含時間戳）
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFileName = `mistmall-backup-${timestamp}.db`;
const backupPath = path.join(backupDir, backupFileName);

console.log('🔄 開始數據庫備份...');
console.log('📂 源文件:', dbPath);
console.log('💾 備份文件:', backupPath);

try {
  if (!fs.existsSync(dbPath)) {
    console.error('❌ 源數據庫文件不存在:', dbPath);
    process.exit(1);
  }

  // 複製數據庫文件
  fs.copyFileSync(dbPath, backupPath);
  
  // 檢查備份文件大小
  const originalSize = fs.statSync(dbPath).size;
  const backupSize = fs.statSync(backupPath).size;
  
  if (originalSize === backupSize) {
    console.log('✅ 數據庫備份成功');
    console.log(`📊 文件大小: ${(backupSize / 1024).toFixed(2)} KB`);
    console.log(`📁 備份位置: ${backupPath}`);
    
    // 清理舊備份（保留最近10個）
    cleanOldBackups();
  } else {
    console.error('❌ 備份文件大小不匹配');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ 備份失敗:', error.message);
  process.exit(1);
}

function cleanOldBackups() {
  try {
    const files = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('mistmall-backup-') && file.endsWith('.db'))
      .map(file => ({
        name: file,
        path: path.join(backupDir, file),
        time: fs.statSync(path.join(backupDir, file)).mtime
      }))
      .sort((a, b) => b.time - a.time);

    if (files.length > 10) {
      const filesToDelete = files.slice(10);
      filesToDelete.forEach(file => {
        fs.unlinkSync(file.path);
        console.log(`🗑️  刪除舊備份: ${file.name}`);
      });
    }
    
    console.log(`📋 保留 ${Math.min(files.length, 10)} 個備份文件`);
  } catch (error) {
    console.warn('⚠️  清理舊備份時出錯:', error.message);
  }
}
