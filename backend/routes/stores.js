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
      logisticsSubType = 'UNIMART', // UNIMART: 7-ELEVEN, FAMI: 全家, HILIFE: 萊爾富, OKMART: OK超商
      isCollection = 'N',
      extraData = ''
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
      extraData
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
    console.log('📍 收到電子地圖回傳:', req.body);
    
    const storeData = {
      storeId: req.body.CVSStoreID || '',
      storeName: req.body.CVSStoreName || '',
      storeAddress: req.body.CVSAddress || '',
      storeTelephone: req.body.CVSTelephone || '',
      extraData: req.body.ExtraData || ''
    };

    // 回傳JavaScript來關閉彈窗並傳遞數據給父視窗
    const callbackScript = `
    <script>
      try {
        // 傳遞店舖資料給父視窗
        if (window.opener && typeof window.opener.handleStoreSelection === 'function') {
          window.opener.handleStoreSelection(${JSON.stringify(storeData)});
        }
        // 關閉彈出視窗
        window.close();
      } catch (error) {
        console.error('回傳處理錯誤:', error);
        alert('店舖選擇完成，請手動關閉此視窗');
      }
    </script>
    `;

    res.send(callbackScript);

  } catch (error) {
    console.error('❌ 電子地圖回傳處理失敗:', error);
    res.status(500).send('處理失敗');
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