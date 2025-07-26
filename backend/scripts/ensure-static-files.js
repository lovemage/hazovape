const fs = require('fs');
const path = require('path');

// 確保靜態文件在 Railway 環境中正確配置
async function ensureStaticFiles() {
  console.log('📁 檢查並設置靜態文件...');
  
  if (process.env.NODE_ENV === 'production') {
    const volumeUploadsPath = '/app/data/uploads';
    const staticDir = path.join(volumeUploadsPath, 'static');
    
    // 確保 volume 中的靜態目錄存在
    if (!fs.existsSync(staticDir)) {
      fs.mkdirSync(staticDir, { recursive: true });
      console.log('✅ 創建 volume 靜態目錄:', staticDir);
    }
    
    // 檢查默認廣告圖片是否存在（作為備份）
    const defaultAdImagePath = path.join(staticDir, 'unlock-popup.png');
    if (!fs.existsSync(defaultAdImagePath)) {
      // 嘗試從項目目錄複製圖片
      const sourceImagePath = path.join(__dirname, '../uploads/static/unlock-popup.png');
      if (fs.existsSync(sourceImagePath)) {
        fs.copyFileSync(sourceImagePath, defaultAdImagePath);
        console.log('✅ 複製默認廣告圖片到 volume:', defaultAdImagePath);
      } else {
        console.log('⚠️ 默認廣告圖片源文件不存在:', sourceImagePath);
      }
    } else {
      console.log('✅ 默認廣告圖片已存在於 volume:', defaultAdImagePath);
    }
    
    // 列出所有彈窗圖片（popup-* 開頭的檔案）
    try {
      const files = fs.readdirSync(staticDir);
      const popupImages = files.filter(file => file.startsWith('popup-'));
      if (popupImages.length > 0) {
        console.log('📸 已上傳的彈窗圖片:');
        popupImages.forEach(file => {
          console.log(`   - ${file}`);
        });
      }
    } catch (error) {
      console.log('⚠️ 無法讀取彈窗圖片列表:', error.message);
    }
    
    // 檢查其他必要的靜態文件
    console.log('📊 volume 靜態文件狀態:');
    try {
      const files = fs.readdirSync(staticDir);
      console.log('   - 文件數量:', files.length);
      files.forEach(file => {
        const filePath = path.join(staticDir, file);
        const stats = fs.statSync(filePath);
        console.log(`   - ${file}: ${(stats.size / 1024).toFixed(1)} KB`);
      });
    } catch (error) {
      console.log('   - 讀取目錄失敗:', error.message);
    }
  } else {
    // 本地開發環境檢查
    const localStaticDir = path.join(__dirname, '../uploads/static');
    if (fs.existsSync(localStaticDir)) {
      const files = fs.readdirSync(localStaticDir);
      console.log('📊 本地靜態文件:', files.length, '個文件');
    } else {
      console.log('⚠️ 本地靜態目錄不存在');
    }
  }
}

module.exports = ensureStaticFiles;

// 如果直接運行此腳本
if (require.main === module) {
  ensureStaticFiles().catch(console.error);
} 