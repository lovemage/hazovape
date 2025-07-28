const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// 導入數據庫檢查和恢復功能（如果存在）
let checkAndRestoreDatabase = null;
let restoreProductionData = null;

try {
  checkAndRestoreDatabase = require('./scripts/check-and-restore-db');
} catch (e) {
  console.log('⚠️  check-and-restore-db 腳本不存在，跳過');
}

try {
  restoreProductionData = require('./scripts/restore-production-data');
} catch (e) {
  console.log('⚠️  restore-production-data 腳本不存在，跳過');
}

const app = express();
const PORT = process.env.PORT || 3001;

// Railway 環境配置：信任代理
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', true);
  console.log('✅ 已啟用 trust proxy 設置');
}

// 中間件
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "img-src": ["'self'", "data:", "blob:", "https:"],
    },
  },
}));
// CORS 配置
const corsOptions = {
  credentials: true
};

// 生產環境允許同源請求，開發環境允許 localhost:5173
if (process.env.NODE_ENV === 'production') {
  corsOptions.origin = true; // 允許同源請求
} else {
  corsOptions.origin = 'http://localhost:5173';
}

app.use(cors(corsOptions));

// 限制請求頻率（Railway 環境配置）
const limiterConfig = {
  windowMs: 15 * 60 * 1000, // 15 分鐘
  max: 1000, // 每個 IP 每15分鐘最多1000個請求
  message: '請求過於頻繁，請稍後再試',
  standardHeaders: true,
  legacyHeaders: false,
};

// 只在生產環境啟用 trust proxy，並正確配置
if (process.env.NODE_ENV === 'production') {
  // 使用 skip 函數來避免 trust proxy 警告
  limiterConfig.skip = (req) => {
    // 可以在這裡添加跳過限制的邏輯
    return false;
  };
  // 使用自定義 keyGenerator 來避免 trust proxy 問題
  limiterConfig.keyGenerator = (req) => {
    return req.ip || req.connection.remoteAddress || 'unknown';
  };
}

const limiter = rateLimit(limiterConfig);
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 請求日志中間件
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - Origin: ${req.headers.origin || 'none'}`);
  next();
});

// 靜態文件服務 - 支持 Railway Volume
const getUploadsPath = () => {
  // 優先使用環境變數 UPLOADS_PATH（用於 Railway Volume）
  if (process.env.UPLOADS_PATH) {
    return process.env.UPLOADS_PATH;
  }
  
  // 根據環境判斷
  if (process.env.NODE_ENV === 'production') {
    // Railway 生產環境：使用 Volume 路徑（備用方案）
    return '/app/data/uploads';
  } else {
    // 本地開發環境：使用相對路徑
    return path.join(__dirname, 'uploads');
  }
};

const uploadsPath = getUploadsPath();
console.log('📁 靜態文件服務路徑:', uploadsPath);

app.use('/uploads', express.static(uploadsPath));

// 確保上傳目錄存在
const uploadsDir = uploadsPath;
const productsDir = path.join(uploadsPath, 'products');
const staticDir = path.join(uploadsPath, 'static');

if (!require('fs').existsSync(uploadsDir)) {
  require('fs').mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ 創建上傳目錄:', uploadsDir);
}
if (!require('fs').existsSync(productsDir)) {
  require('fs').mkdirSync(productsDir, { recursive: true });
  console.log('✅ 創建商品圖片目錄:', productsDir);
}
if (!require('fs').existsSync(staticDir)) {
  require('fs').mkdirSync(staticDir, { recursive: true });
  console.log('✅ 創建靜態圖片目錄:', staticDir);
}

// 服務前端靜態文件（生產環境）
if (process.env.NODE_ENV === 'production') {
  // 服務前端構建的靜態文件
  app.use(express.static(path.join(__dirname, '../dist')));

  // 服務前端的 images 目錄（默認圖片）
  app.use('/images', express.static(path.join(__dirname, '../dist/images')));
}

// API 路由
app.use('/api/auth', require('./routes/auth').router);
app.use('/api/flavors', require('./routes/flavors'));
app.use('/api/flavor-categories', require('./routes/flavor-categories'));
app.use('/api/products', require('./routes/products'));
app.use('/api/product-categories', require('./routes/product-categories'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/upsell-products', require('./routes/upsell-products'));
app.use('/api/store-callback', require('./routes/store-callback'));

// 7-11 門市選擇回調處理
app.use('/store-callback.html', require('./routes/store-callback'));

// 臨時調試路由
app.use('/api/debug', require('./routes/debug'));

// 7-11門市查詢回調處理 - 返回 JavaScript 來更新父視窗
app.post('/checkout', (req, res) => {
  console.log('📍 收到7-11門市查詢回調:', req.body);

  try {
    // 解析7-11回傳的數據
    const storeData = req.body;

    // 提取門市信息
    const storeName = storeData.storename || '';
    const storeId = storeData.storeid || '';
    const storeAddress = storeData.storeaddress || '';

    console.log('🔍 解析到的門市信息:', {
      storeName,
      storeId,
      storeAddress
    });

    // 返回 HTML 頁面，包含 JavaScript 來更新父視窗
    const html = `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>門市選擇完成</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .container {
            text-align: center;
            padding: 2rem;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            backdrop-filter: blur(10px);
        }
    </style>
</head>
<body>
    <div class="container">
        <h2>✅ 門市選擇完成</h2>
        <p><strong>門市：</strong>${storeName}</p>
        <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin: 10px 0;">
            <span><strong>代號：</strong>${storeId}</span>
            <button onclick="copyStoreId()" style="
                background: rgba(255, 255, 255, 0.2);
                border: 1px solid rgba(255, 255, 255, 0.3);
                color: white;
                padding: 5px 10px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 12px;
            ">複製</button>
        </div>
        <p id="status">正在返回結帳頁面...</p>
        <p style="font-size: 14px; opacity: 0.8; margin-top: 20px;">
            若未自動返回，請複製商店代號後關閉此視窗，再貼上收件店號欄位
        </p>
        <button onclick="closeWindow()" style="
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: white;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            margin-top: 15px;
        ">關閉視窗</button>
    </div>

    <script>
        console.log('🏪 門市回調頁面載入');

        const storeName = \`${storeName}\`;
        const storeId = \`${storeId}\`;
        const storeAddress = \`${storeAddress}\`;

        console.log('📋 門市數據:', { storeName, storeId, storeAddress });

        // 複製店號功能
        function copyStoreId() {
            console.log('📋 嘗試複製店號:', storeId);

            // 方法1: 使用現代 clipboard API
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(storeId).then(() => {
                    showMessage('✅ 店號已複製：' + storeId, 'success');
                    console.log('✅ 複製成功 (clipboard API)');
                }).catch((err) => {
                    console.log('❌ clipboard API 失敗，使用降級方案:', err);
                    fallbackCopy();
                });
            } else {
                console.log('⚠️  不支援 clipboard API 或非安全上下文，使用降級方案');
                fallbackCopy();
            }
        }

        function fallbackCopy() {
            try {
                // 方法2: 使用 document.execCommand (已棄用但更兼容)
                const textArea = document.createElement('textarea');
                textArea.value = storeId;
                textArea.style.position = 'fixed';
                textArea.style.left = '-9999px';
                textArea.style.top = '-9999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);

                if (successful) {
                    showMessage('✅ 店號已複製：' + storeId, 'success');
                    console.log('✅ 複製成功 (execCommand)');
                } else {
                    throw new Error('execCommand 返回 false');
                }
            } catch (err) {
                console.log('❌ 所有複製方法都失敗:', err);
                showMessage('❌ 自動複製失敗\\n店號：' + storeId + '\\n請手動選取複製', 'error');
                
                // 方法3: 選中文字讓用戶手動複製
                selectStoreIdText();
            }
        }

        function selectStoreIdText() {
            try {
                // 創建一個臨時的可選中元素
                const tempDiv = document.createElement('div');
                tempDiv.style.position = 'fixed';
                tempDiv.style.top = '50%';
                tempDiv.style.left = '50%';
                tempDiv.style.transform = 'translate(-50%, -50%)';
                tempDiv.style.background = 'white';
                tempDiv.style.color = 'black';
                tempDiv.style.padding = '20px';
                tempDiv.style.border = '2px solid #007bff';
                tempDiv.style.borderRadius = '8px';
                tempDiv.style.fontSize = '18px';
                tempDiv.style.fontWeight = 'bold';
                tempDiv.style.userSelect = 'text';
                tempDiv.style.zIndex = '9999';
                tempDiv.textContent = storeId;
                
                document.body.appendChild(tempDiv);
                
                // 選中文字
                const range = document.createRange();
                range.selectNodeContents(tempDiv);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
                
                // 3秒後移除
                setTimeout(() => {
                    if (document.body.contains(tempDiv)) {
                        document.body.removeChild(tempDiv);
                    }
                }, 3000);
                
            } catch (err) {
                console.log('❌ 選中文字也失敗:', err);
            }
        }

        function showMessage(message, type = 'info') {
            // 更新狀態顯示
            const statusEl = document.getElementById('status');
            if (statusEl) {
                statusEl.textContent = message;
                statusEl.style.color = type === 'success' ? '#28a745' : 
                                     type === 'error' ? '#dc3545' : '#17a2b8';
            }
            
            // 也顯示alert作為備用
            alert(message);
        }

        // 關閉視窗功能
        function closeWindow() {
            console.log('🔄 關閉視窗被點擊');

            try {
                // 如果有父視窗，可以嘗試將門市信息傳遞回去
                if (window.opener && !window.opener.closed) {
                    console.log('✅ 找到父視窗，傳遞門市信息');
                    
                    const params = new URLSearchParams();
                    if (storeName) params.append('storeName', storeName);
                    if (storeId) params.append('storeId', storeId);
                    if (storeAddress) params.append('storeAddress', storeAddress);

                    const callbackUrl = '/checkout?' + params.toString();
                    const fullUrl = window.opener.location.origin + callbackUrl;
                    console.log('🔗 重定向父視窗到:', fullUrl);
                    window.opener.location.href = fullUrl;
                }

                // 更新狀態
                document.getElementById('status').textContent = '✅ 視窗即將關閉';

                // 關閉當前視窗
                setTimeout(() => {
                    console.log('🔄 關閉視窗');
                    window.close();
                }, 1000);

            } catch (error) {
                console.error('❌ 關閉視窗過程中發生錯誤:', error);
                // 強制關閉視窗
                window.close();
            }
        }

        // 自動返回邏輯
        function autoReturn() {
            console.log('🔄 開始自動返回流程');

            try {
                if (window.opener && !window.opener.closed) {
                    console.log('✅ 找到父視窗，發送門市數據');

                    const params = new URLSearchParams();
                    if (storeName) params.append('storeName', storeName);
                    if (storeId) params.append('storeId', storeId);
                    if (storeAddress) params.append('storeAddress', storeAddress);

                    const callbackUrl = window.opener.location.origin + '/checkout?' + params.toString();
                    console.log('🔄 重定向父視窗到:', callbackUrl);

                    // 重定向父視窗
                    window.opener.location.href = callbackUrl;

                    // 更新狀態
                    document.getElementById('status').textContent = '✅ 已自動返回結帳頁面，視窗即將關閉';

                    // 關閉當前視窗
                    setTimeout(() => {
                        console.log('🔄 關閉當前視窗');
                        window.close();
                    }, 2000);
                } else {
                    console.log('❌ 找不到父視窗或父視窗已關閉');
                    document.getElementById('status').textContent = '❌ 無法自動返回，請使用下方按鈕';
                }
            } catch (error) {
                console.error('❌ 自動返回失敗:', error);
                document.getElementById('status').textContent = '❌ 自動返回失敗，請使用下方按鈕';
            }
        }

        // 頁面載入後執行自動返回
        console.log('⏰ 設置自動返回定時器');
        setTimeout(() => {
            console.log('⏰ 執行自動返回');
            autoReturn();
        }, 2000); // 增加到2秒，確保頁面完全載入
    </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);

  } catch (error) {
    console.error('❌ 7-11回調處理錯誤:', error);
    res.redirect('/checkout?error=store_selection_failed');
  }
});

// 簡單健康檢查
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API 健康檢查（更簡單版本）
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 詳細健康檢查端點
app.get('/api/health', async (req, res) => {
  try {
    const Database = require('./config/database');
    const fs = require('fs');

    // 檢查數據庫連接
    await Database.get('SELECT 1');

    // 檢查關鍵表
    const tables = ['products', 'flavors', 'orders', 'announcements'];
    const tableChecks = {};

    for (const table of tables) {
      try {
        const result = await Database.get(`SELECT COUNT(*) as count FROM ${table}`);
        tableChecks[table] = result.count;
      } catch (error) {
        tableChecks[table] = 'ERROR';
      }
    }

    // 檢查上傳目錄
    const uploadsDir = getUploadsPath();
    const productsDir = path.join(uploadsDir, 'products');
    const uploadStatus = {
      uploadsDir: {
        exists: fs.existsSync(uploadsDir),
        path: uploadsDir
      },
      productsDir: {
        exists: fs.existsSync(productsDir),
        path: productsDir,
        files: []
      }
    };

    // 列出產品圖片文件
    if (fs.existsSync(productsDir)) {
      try {
        uploadStatus.productsDir.files = fs.readdirSync(productsDir);
      } catch (error) {
        uploadStatus.productsDir.error = error.message;
      }
    }

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      tables: tableChecks,
      uploads: uploadStatus,
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      environment: process.env.NODE_ENV || 'development'
    });
  }
});

// 錯誤處理中間件
app.use((err, req, res, next) => {
  console.error('錯誤:', err.stack);
  res.status(500).json({ 
    success: false, 
    message: '服務器內部錯誤' 
  });
});

// 處理前端路由（SPA）
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    // 如果是 API 請求，返回 404
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({
        success: false,
        message: '找不到請求的資源'
      });
    }
    // 否則返回前端 index.html
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
} else {
  // 開發環境的 404 處理
  app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      message: '找不到請求的資源'
    });
  });
}

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Mist Mall 後端服務器運行於端口 ${PORT}`);
  console.log(`訪問地址: http://localhost:${PORT}`);

  // Railway 健康檢查
  if (process.env.NODE_ENV === 'production') {
    console.log('✅ Railway 生產環境啟動成功');

    // 運行數據庫維護操作（異步，不阻塞服務器）
    setTimeout(async () => {
      try {
        console.log('🔧 開始數據庫維護檢查...');
        
        // 確保靜態文件目錄存在
        const ensureStaticFiles = require('./scripts/ensure-static-files');
        await ensureStaticFiles();
        console.log('✅ 靜態文件檢查完成');
        
        console.log('✅ 數據庫維護完成');
      } catch (error) {
        console.error('⚠️ 數據庫維護失敗:', error.message);
        // 不要讓錯誤影響服務器運行
      }
    }, 5000); // 5秒後運行，確保服務器已完全啟動
  }
});

// 優雅關閉處理
process.on('SIGTERM', () => {
  console.log('🔄 收到 SIGTERM，正在優雅關閉...');
  server.close(() => {
    console.log('✅ 服務器已關閉');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🔄 收到 SIGINT，正在優雅關閉...');
  server.close(() => {
    console.log('✅ 服務器已關閉');
    process.exit(0);
  });
});
