const fs = require('fs');
const path = require('path');

// 確保靜態文件在生產環境中正確配置
async function ensureStaticFiles() {
  console.log('📁 檢查並設置靜態文件...');
  
  if (process.env.NODE_ENV === 'production') {
    let uploadsPath;
    
    // 支持不同的生產環境
    if (process.env.UPLOADS_PATH) {
      // Railway Volume 環境
      uploadsPath = process.env.UPLOADS_PATH;
    } else {
      // Heroku 環境
      uploadsPath = path.join(__dirname, '../../dist/uploads');
    }
    
    const staticDir = path.join(uploadsPath, 'static');
    const productsDir = path.join(uploadsPath, 'products');
    
    // 確保目錄存在
    [staticDir, productsDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log('✅ 創建目錄:', dir);
      }
    });
    
    // 檢查默認廣告圖片是否存在
    const defaultAdImagePath = path.join(staticDir, 'unlock-popup.png');
    if (!fs.existsSync(defaultAdImagePath)) {
      // 嘗試從不同位置複製圖片
      const possibleSources = [
        path.join(__dirname, '../../dist/images/unlock-popup.png'),
        path.join(__dirname, '../uploads/static/unlock-popup.png'),
        path.join(__dirname, '../../src/assets/unlock-popup.png')
      ];
      
      let copied = false;
      for (const sourcePath of possibleSources) {
        if (fs.existsSync(sourcePath)) {
          fs.copyFileSync(sourcePath, defaultAdImagePath);
          console.log('✅ 複製默認廣告圖片:', sourcePath, '->', defaultAdImagePath);
          copied = true;
          break;
        }
      }
      
      if (!copied) {
        console.log('⚠️ 未找到默認廣告圖片源文件');
      }
    } else {
      console.log('✅ 默認廣告圖片已存在:', defaultAdImagePath);
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
    console.log('📊 生產環境靜態文件狀態:');
    
    // 檢查 static 目錄
    try {
      const staticFiles = fs.readdirSync(staticDir);
      console.log(`   - static 目錄: ${staticFiles.length} 個文件`);
      staticFiles.forEach(file => {
        const filePath = path.join(staticDir, file);
        const stats = fs.statSync(filePath);
        console.log(`     - ${file}: ${(stats.size / 1024).toFixed(1)} KB`);
      });
    } catch (error) {
      console.log('   - static 目錄讀取失敗:', error.message);
    }
    
    // 檢查 products 目錄
    try {
      const productFiles = fs.readdirSync(productsDir);
      console.log(`   - products 目錄: ${productFiles.length} 個文件`);
      if (productFiles.length > 0) {
        productFiles.slice(0, 3).forEach(file => {
          const filePath = path.join(productsDir, file);
          const stats = fs.statSync(filePath);
          console.log(`     - ${file}: ${(stats.size / 1024).toFixed(1)} KB`);
        });
        if (productFiles.length > 3) {
          console.log(`     ... 還有 ${productFiles.length - 3} 個文件`);
        }
      }
    } catch (error) {
      console.log('   - products 目錄讀取失敗:', error.message);
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