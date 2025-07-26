const express = require('express');
const router = express.Router();

// 處理 7-11 門市選擇回調
router.post('/', (req, res) => {
  console.log('🏪 收到 7-11 門市選擇回調 (POST)');
  console.log('📋 POST Body:', req.body);
  console.log('📋 Query Params:', req.query);
  console.log('📋 Headers:', req.headers);

  // 提取門市信息（支援多種參數格式）
  const storeName = req.body.storeName || req.body.CVSStoreName || req.query.storeName || req.query.CVSStoreName;
  const storeId = req.body.storeId || req.body.CVSStoreID || req.query.storeId || req.query.CVSStoreID;
  const storeAddress = req.body.storeAddress || req.body.CVSAddress || req.query.storeAddress || req.query.CVSAddress;

  console.log('🔍 解析到的門市信息:', {
    storeName,
    storeId,
    storeAddress
  });

  // 構建回調頁面的 HTML，包含 postMessage 邏輯
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
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        .icon {
            font-size: 3rem;
            margin-bottom: 1rem;
        }
        .title {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
        }
        .subtitle {
            font-size: 1rem;
            opacity: 0.8;
            margin-bottom: 1.5rem;
        }
        .store-info {
            background: rgba(255, 255, 255, 0.2);
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 1.5rem;
        }
        .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 1s ease-in-out infinite;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">🏪</div>
        <div class="title">門市選擇完成</div>
        <div class="subtitle" id="subtitle">正在將門市信息傳送回結帳頁面...</div>
        
        <div class="store-info" id="storeInfo" style="display: ${storeName && storeId ? 'block' : 'none'};">
            <div><strong>門市名稱：</strong><span id="storeName">${storeName || ''}</span></div>
            <div><strong>門市代號：</strong><span id="storeId">${storeId || ''}</span></div>
            <div><strong>門市地址：</strong><span id="storeAddress">${storeAddress || '地址信息未提供'}</span></div>
        </div>
        
        <div class="loading" id="loading"></div>
        
        <div style="margin-top: 1rem; font-size: 0.9rem; opacity: 0.7;">
            此視窗將在 3 秒後自動關閉
        </div>
    </div>

    <script>
        // 將數據存儲在全局變量中
        window.storeData = {
            storeName: '${storeName || ''}',
            storeId: '${storeId || ''}',
            storeAddress: '${storeAddress || ''}'
        };
    </script>
    <script src="/store-callback.js"></script>
</body>
</html>`;

  // 返回 HTML 頁面
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// 也支援 GET 請求（備用）
router.get('/', (req, res) => {
  console.log('🏪 收到 7-11 門市選擇回調 (GET)');
  console.log('📋 Query Params:', req.query);

  // 重定向到靜態 HTML 文件，並傳遞參數
  const params = new URLSearchParams(req.query);
  res.redirect(`/store-callback.html?${params.toString()}`);
});

module.exports = router;
