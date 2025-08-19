const express = require('express');
const Database = require('../config/database');
const ECPayLogistics = require('../services/ecpayLogistics');

const router = express.Router();
const ecpayLogistics = new ECPayLogistics();

// 搜尋門市 API - 使用綠界物流API
router.get('/search', async (req, res) => {
  try {
    const { query, type = 'name', cvsType = 'UNIMART' } = req.query;

    if (!query || !query.trim()) {
      return res.json({
        stores: [],
        total: 0,
        query: query || '',
        type,
        cvsType
      });
    }

    const searchQuery = query.trim();
    console.log('🔍 使用綠界API搜尋門市:', { query: searchQuery, type, cvsType });

    // 使用綠界物流API搜尋店舖
    const result = await ecpayLogistics.searchStores(searchQuery, type, cvsType);

    if (!result.success) {
      console.error('❌ 綠界API搜尋失敗:', result.error);
      return res.status(500).json({
        success: false,
        message: '搜尋門市失敗',
        error: result.error,
        stores: [],
        total: 0
      });
    }

    console.log(`✅ 找到 ${result.stores.length} 個門市`);

    res.json({
      stores: result.stores,
      total: result.total,
      query: searchQuery,
      type,
      cvsType,
      source: 'ecpay'
    });

  } catch (error) {
    console.error('❌ 搜尋門市失敗:', error);
    res.status(500).json({
      success: false,
      message: '搜尋門市失敗',
      error: error.message,
      stores: [],
      total: 0
    });
  }
});

// 獲取門市詳情 API
router.get('/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;

    console.log('📍 獲取門市詳情:', storeId);

    const store = await Database.get(`
      SELECT id, name, tel, address, lat, lng, city, area, service
      FROM stores 
      WHERE id = ?
    `, [storeId]);

    if (!store) {
      return res.status(404).json({
        success: false,
        message: '找不到指定門市'
      });
    }

    // 處理服務資料
    const processedStore = {
      ...store,
      service: store.service ? JSON.parse(store.service) : []
    };

    console.log('✅ 門市詳情獲取成功:', store.name);

    res.json({
      store: processedStore
    });

  } catch (error) {
    console.error('❌ 獲取門市詳情失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取門市詳情失敗',
      error: error.message
    });
  }
});

// 獲取門市列表 API（支援分頁和篩選）
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, city, area } = req.query;
    const offset = (page - 1) * parseInt(limit);

    let whereClause = '1=1';
    let params = [];

    if (city) {
      whereClause += ' AND city = ?';
      params.push(city);
    }

    if (area) {
      whereClause += ' AND area = ?';
      params.push(area);
    }

    console.log('📋 獲取門市列表:', { page, limit, city, area });

    const stores = await Database.all(`
      SELECT id, name, tel, address, lat, lng, city, area, service
      FROM stores 
      WHERE ${whereClause}
      ORDER BY city, area, name
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    const totalCount = await Database.get(`
      SELECT COUNT(*) as count FROM stores WHERE ${whereClause}
    `, params);

    // 處理服務資料
    const processedStores = stores.map(store => ({
      ...store,
      service: store.service ? JSON.parse(store.service) : []
    }));

    console.log(`✅ 獲取 ${processedStores.length} 個門市，總計 ${totalCount.count} 個`);

    res.json({
      stores: processedStores,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(totalCount.count / parseInt(limit)),
        total_items: totalCount.count,
        per_page: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('❌ 獲取門市列表失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取門市列表失敗',
      error: error.message
    });
  }
});

// 獲取城市和區域列表 API
router.get('/meta/locations', async (req, res) => {
  try {
    console.log('🏙️ 獲取城市和區域列表');

    const locations = await Database.all(`
      SELECT city, area, COUNT(*) as store_count
      FROM stores 
      GROUP BY city, area
      ORDER BY city, area
    `);

    // 按城市分組
    const groupedLocations = {};
    locations.forEach(location => {
      if (!groupedLocations[location.city]) {
        groupedLocations[location.city] = [];
      }
      groupedLocations[location.city].push({
        area: location.area,
        store_count: location.store_count
      });
    });

    console.log(`✅ 獲取 ${Object.keys(groupedLocations).length} 個城市的區域資料`);

    res.json({
      locations: groupedLocations
    });

  } catch (error) {
    console.error('❌ 獲取城市和區域列表失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取城市和區域列表失敗',
      error: error.message
    });
  }
});

// 生成電子地圖選擇器參數
router.post('/map-selector', async (req, res) => {
  try {
    const {
      logisticsSubType = 'UNIMARTC2C', // C2C: UNIMARTC2C (7-ELEVEN超商交貨便)
      isCollection = 'N',
      extraData = '',
      device = 0  // 0: PC, 1: Mobile
    } = req.body;

    // 生成回傳URL
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://hazo-vape-48500ebcf15b.herokuapp.com'
      : 'http://localhost:3001';
    
    const serverReplyURL = `${baseUrl}/api/stores/map-callback`;

    console.log('🗺️ 開始生成電子地圖參數');
    
    const mapData = ecpayLogistics.generateMapParams({
      logisticsSubType,
      isCollection,
      serverReplyURL,
      extraData,
      device
    });

    res.json({
      success: true,
      message: '電子地圖參數生成成功',
      ...mapData
    });

  } catch (error) {
    console.error('❌ 生成電子地圖參數失敗:', error);
    res.status(500).json({
      success: false,
      message: '生成電子地圖參數失敗',
      error: error.message
    });
  }
});

// 電子地圖回傳處理
router.post('/map-callback', (req, res) => {
  try {
    console.log('📍 收到電子地圖回傳 - 原始數據:', req.body);
    console.log('📍 請求頭:', req.headers);
    
    // ECPay 可能使用不同的參數名稱，我們需要檢查所有可能的欄位
    const rawData = req.body;
    
    // 嘗試從不同可能的欄位名稱中提取數據
    const storeData = {
      storeId: rawData.CVSStoreID || rawData.storeId || rawData.StoreId || rawData.storeid || '',
      storeName: rawData.CVSStoreName || rawData.storeName || rawData.StoreName || rawData.storename || '',
      storeAddress: rawData.CVSAddress || rawData.storeAddress || rawData.StoreAddress || rawData.address || '',
      storeTelephone: rawData.CVSTelephone || rawData.storeTelephone || rawData.StoreTelephone || rawData.telephone || rawData.phone || '',
      extraData: rawData.ExtraData || rawData.extraData || ''
    };

    console.log('📍 解析後的店舖數據:', storeData);

    // 回傳完整的 HTML 頁面，包含詳細的 JavaScript 處理
    const callbackHtml = `
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
                background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                color: white;
            }
            .container {
                text-align: center;
                padding: 2rem;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                backdrop-filter: blur(10px);
                max-width: 400px;
            }
            .store-info {
                background: rgba(255, 255, 255, 0.2);
                padding: 1rem;
                border-radius: 8px;
                margin: 1rem 0;
                text-align: left;
            }
            .button {
                background: rgba(255, 255, 255, 0.2);
                border: 1px solid rgba(255, 255, 255, 0.3);
                color: white;
                padding: 10px 20px;
                border-radius: 8px;
                cursor: pointer;
                margin: 5px;
                font-size: 14px;
            }
            .button:hover {
                background: rgba(255, 255, 255, 0.3);
            }
            .status {
                margin: 1rem 0;
                padding: 0.5rem;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 6px;
                font-size: 14px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h2>✅ 門市選擇完成</h2>
            <div class="store-info">
                <p><strong>門市名稱：</strong><span id="storeName">${storeData.storeName}</span></p>
                <p><strong>門市代號：</strong><span id="storeId">${storeData.storeId}</span></p>
                <p><strong>門市地址：</strong><span id="storeAddress">${storeData.storeAddress}</span></p>
                ${storeData.storeTelephone ? `<p><strong>門市電話：</strong><span id="storeTel">${storeData.storeTelephone}</span></p>` : ''}
            </div>
            <div id="status" class="status">正在處理門市選擇...</div>
            <div>
                <button class="button" onclick="retryCallback()">重新傳送</button>
                <button class="button" onclick="checkAndTransfer()">檢查並傳送</button>
                <button class="button" onclick="copyStoreInfo()">複製門市資訊</button>
                <button class="button" onclick="closeWindow()">關閉視窗</button>
            </div>
        </div>

        <script>
            console.log('🏪 ECPay 回調頁面載入');
            
            const storeData = ${JSON.stringify(storeData)};
            console.log('📋 門市數據:', storeData);

            let callbackAttempts = 0;
            const maxAttempts = 3;

            function updateStatus(message, type = 'info') {
                const statusEl = document.getElementById('status');
                if (statusEl) {
                    statusEl.textContent = message;
                    statusEl.style.backgroundColor = type === 'success' ? 'rgba(40, 167, 69, 0.3)' : 
                                                   type === 'error' ? 'rgba(220, 53, 69, 0.3)' : 
                                                   'rgba(255, 255, 255, 0.1)';
                }
            }

            function sendStoreDataToParent() {
                return new Promise((resolve, reject) => {
                    try {
                        console.log('🔄 嘗試傳送門市數據，嘗試次數:', callbackAttempts + 1);
                        console.log('🔄 門市數據:', storeData);
                        
                        let success = false;
                        
                        // 方法 1: 嘗試使用 window.opener (傳統彈窗方式)
                        try {
                            if (window.opener && !window.opener.closed && typeof window.opener.handleStoreSelection === 'function') {
                                console.log('✅ 找到 handleStoreSelection 函數，執行回調');
                                window.opener.handleStoreSelection(storeData);
                                updateStatus('✅ 門市資訊已成功傳送 (window.opener)', 'success');
                                success = true;
                            }
                        } catch (openerError) {
                            console.log('⚠️ window.opener 方法失敗:', openerError.message);
                        }
                        
                        // 方法 2: 使用 localStorage 作為跨標籤頁通訊 (ECPay 回調常用)
                        if (!success) {
                            console.log('🔄 使用 localStorage 儲存門市數據');
                            
                            const storeSelectionData = {
                                timestamp: Date.now(),
                                storeData: storeData,
                                source: 'ecpay_callback'
                            };
                            
                            localStorage.setItem('ecpay_store_selection', JSON.stringify(storeSelectionData));
                            
                            // 觸發 storage 事件來通知其他標籤頁
                            window.dispatchEvent(new StorageEvent('storage', {
                                key: 'ecpay_store_selection',
                                newValue: JSON.stringify(storeSelectionData),
                                oldValue: null
                            }));
                            
                            updateStatus('✅ 門市資訊已儲存至 localStorage', 'success');
                            success = true;
                        }
                        
                        // 方法 3: 嘗試 postMessage 到所有可能的視窗
                        if (!success) {
                            try {
                                if (window.opener) {
                                    console.log('🔄 嘗試使用 postMessage');
                                    window.opener.postMessage({
                                        type: 'STORE_SELECTION',
                                        data: storeData
                                    }, '*');
                                    updateStatus('📡 已使用 postMessage 傳送', 'success');
                                    success = true;
                                }
                            } catch (postMessageError) {
                                console.log('⚠️ postMessage 方法失敗:', postMessageError.message);
                            }
                        }
                        
                        if (success) {
                            resolve(true);
                        } else {
                            throw new Error('所有傳送方法都失敗');
                        }
                        
                    } catch (error) {
                        console.error('❌ 傳送門市數據失敗:', error);
                        updateStatus('❌ 傳送失敗: ' + error.message, 'error');
                        reject(error);
                    }
                });
            }

            function retryCallback() {
                if (callbackAttempts < maxAttempts) {
                    callbackAttempts++;
                    updateStatus('🔄 重新嘗試傳送中...', 'info');
                    sendStoreDataToParent().then(() => {
                        setTimeout(() => {
                            closeWindow();
                        }, 2000);
                    }).catch((error) => {
                        console.error('重試失敗:', error);
                    });
                } else {
                    updateStatus('❌ 已達最大重試次數', 'error');
                }
            }

            function checkAndTransfer() {
                console.log('🔍 手動檢查與傳送');
                
                // 檢查 localStorage 中的數據
                try {
                    const storedData = localStorage.getItem('ecpay_store_selection');
                    console.log('📦 localStorage 數據:', storedData);
                    
                    if (storedData) {
                        const parsedData = JSON.parse(storedData);
                        console.log('📦 解析後的數據:', parsedData);
                        updateStatus('✅ localStorage 中找到門市數據', 'success');
                    } else {
                        updateStatus('⚠️ localStorage 中沒有門市數據', 'info');
                    }
                } catch (error) {
                    console.error('❌ 檢查 localStorage 失敗:', error);
                    updateStatus('❌ 檢查 localStorage 失敗', 'error');
                }
                
                // 嘗試通過不同方法傳送數據
                updateStatus('🔄 嘗試多種傳送方法...', 'info');
                
                // 方法1: 直接重新儲存並觸發事件
                const storeSelectionData = {
                    timestamp: Date.now(),
                    storeData: storeData,
                    source: 'ecpay_callback_manual'
                };
                
                localStorage.setItem('ecpay_store_selection_manual', JSON.stringify(storeSelectionData));
                
                // 方法2: 嘗試向主域發送消息
                try {
                    const mainSiteUrl = window.location.origin;
                    console.log('🌐 主站 URL:', mainSiteUrl);
                    
                    // 嘗試向所有可能的窗口發送消息
                    if (window.opener) {
                        window.opener.postMessage({
                            type: 'ECPAY_STORE_SELECTION',
                            data: storeData,
                            source: 'manual_transfer'
                        }, '*');
                        updateStatus('📡 已發送 postMessage 到 opener', 'success');
                    }
                    
                    // 嘗試向當前窗口的父窗口發送
                    if (window.parent && window.parent !== window) {
                        window.parent.postMessage({
                            type: 'ECPAY_STORE_SELECTION',
                            data: storeData,
                            source: 'manual_transfer'
                        }, '*');
                        updateStatus('📡 已發送 postMessage 到 parent', 'success');
                    }
                    
                } catch (postError) {
                    console.error('❌ postMessage 失敗:', postError);
                }
                
                // 方法3: 嘗試重定向到主站並帶參數
                setTimeout(() => {
                    const mainSiteUrl = window.location.origin;
                    const params = new URLSearchParams({
                        storeId: storeData.storeId,
                        storeName: storeData.storeName,
                        storeAddress: storeData.storeAddress,
                        from: 'ecpay_callback'
                    });
                    
                    const redirectUrl = \`\${mainSiteUrl}/checkout?\${params.toString()}\`;
                    console.log('🔄 準備重定向到:', redirectUrl);
                    updateStatus('🔄 正在重定向到結帳頁面...', 'info');
                    
                    window.location.href = redirectUrl;
                }, 2000);
            }

            function copyStoreInfo() {
                const info = \`門市名稱: \${storeData.storeName}\\n門市代號: \${storeData.storeId}\\n門市地址: \${storeData.storeAddress}\${storeData.storeTelephone ? '\\n門市電話: ' + storeData.storeTelephone : ''}\`;
                
                if (navigator.clipboard && window.isSecureContext) {
                    navigator.clipboard.writeText(info).then(() => {
                        updateStatus('✅ 門市資訊已複製', 'success');
                    }).catch(() => {
                        fallbackCopy(info);
                    });
                } else {
                    fallbackCopy(info);
                }
            }

            function fallbackCopy(text) {
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-9999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                
                try {
                    const successful = document.execCommand('copy');
                    if (successful) {
                        updateStatus('✅ 門市資訊已複製', 'success');
                    } else {
                        updateStatus('❌ 複製失敗', 'error');
                    }
                } catch (err) {
                    updateStatus('❌ 複製失敗', 'error');
                }
                
                document.body.removeChild(textArea);
            }

            function closeWindow() {
                updateStatus('🔄 視窗即將關閉...', 'info');
                setTimeout(() => {
                    try {
                        window.close();
                    } catch (error) {
                        console.error('❌ 關閉視窗失敗:', error);
                        updateStatus('❌ 無法自動關閉，請手動關閉視窗', 'error');
                        
                        // 如果無法關閉，嘗試重定向回主站
                        setTimeout(() => {
                            try {
                                const mainSiteUrl = window.location.origin;
                                updateStatus('🔄 重定向回主站...', 'info');
                                window.location.href = mainSiteUrl;
                            } catch (redirectError) {
                                console.error('❌ 重定向失敗:', redirectError);
                            }
                        }, 2000);
                    }
                }, 1000);
            }

            // 頁面載入後自動執行
            window.addEventListener('load', () => {
                console.log('📄 頁面完全載入，開始自動回調流程');
                
                // 給父視窗一些時間來設置回調函數
                setTimeout(() => {
                    sendStoreDataToParent().then(() => {
                        // 成功傳送後等待2秒再關閉
                        setTimeout(() => {
                            closeWindow();
                        }, 2000);
                    }).catch((error) => {
                        console.error('自動回調失敗:', error);
                        updateStatus('❌ 自動傳送失敗，請使用下方按鈕', 'error');
                    });
                }, 1000);
            });

            // 監聽來自父視窗的確認訊息
            window.addEventListener('message', (event) => {
                console.log('📨 收到來自父視窗的訊息:', event.data);
                if (event.data && event.data.type === 'STORE_SELECTION_RECEIVED') {
                    updateStatus('✅ 父視窗已確認收到門市資訊', 'success');
                    setTimeout(() => {
                        closeWindow();
                    }, 1500);
                }
            });
        </script>
    </body>
    </html>
    `;

    // 設定適當的頭部，允許內聯腳本執行
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Security-Policy', 
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; form-action 'self' https://logistics.ecpay.com.tw https://logistics-stage.ecpay.com.tw;"
    );
    res.send(callbackHtml);

  } catch (error) {
    console.error('❌ 電子地圖回傳處理失敗:', error);
    res.status(500).send(`
      <html>
        <body>
          <h3>處理失敗</h3>
          <p>錯誤: ${error.message}</p>
          <button onclick="window.close()">關閉視窗</button>
        </body>
      </html>
    `);
  }
});

// 配置檢查路由
router.get('/config-check', async (req, res) => {
  try {
    console.log('🔧 開始配置檢查');
    const checkResult = ecpayLogistics.checkConfiguration();
    
    res.json({
      success: true,
      message: '配置檢查完成',
      ...checkResult
    });
  } catch (error) {
    console.error('❌ 配置檢查失敗:', error);
    res.status(500).json({
      success: false,
      message: '配置檢查失敗',
      error: error.message
    });
  }
});

// 測試檢查碼生成的路由
router.get('/test-checkmac', async (req, res) => {
  try {
    console.log('🧪 開始測試檢查碼生成');
    const testResult = ecpayLogistics.testCheckMacValue();
    
    res.json({
      success: true,
      message: '檢查碼測試完成',
      ...testResult
    });
  } catch (error) {
    console.error('❌ 檢查碼測試失敗:', error);
    res.status(500).json({
      success: false,
      message: '檢查碼測試失敗',
      error: error.message
    });
  }
});

module.exports = router;