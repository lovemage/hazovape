const express = require('express');
const Database = require('../config/database');

const router = express.Router();

// 搜尋門市 API
router.get('/search', async (req, res) => {
  try {
    const { query, type = 'name', limit = 10 } = req.query;

    if (!query || !query.trim()) {
      return res.json({
        stores: [],
        total: 0,
        query: query || '',
        type
      });
    }

    const searchQuery = query.trim();
    console.log('🔍 搜尋門市:', { query: searchQuery, type, limit });

    let sql = '';
    let params = [];

    switch (type) {
      case 'name':
        sql = `
          SELECT id, name, tel, address
          FROM stores 
          WHERE name LIKE ? 
          ORDER BY name
          LIMIT ?
        `;
        params = [`%${searchQuery}%`, parseInt(limit)];
        break;
      
      case 'address':
        sql = `
          SELECT id, name, tel, address
          FROM stores 
          WHERE address LIKE ? OR city LIKE ? OR area LIKE ?
          ORDER BY city, area, name
          LIMIT ?
        `;
        params = [`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`, parseInt(limit)];
        break;
      
      case 'number':
        sql = `
          SELECT id, name, tel, address
          FROM stores 
          WHERE id LIKE ?
          ORDER BY id
          LIMIT ?
        `;
        params = [`%${searchQuery}%`, parseInt(limit)];
        break;
      
      default:
        // 綜合搜尋
        sql = `
          SELECT id, name, tel, address
          FROM stores 
          WHERE name LIKE ? OR address LIKE ? OR id LIKE ?
          ORDER BY 
            CASE 
              WHEN name LIKE ? THEN 1
              WHEN id LIKE ? THEN 2
              WHEN address LIKE ? THEN 3
              ELSE 4
            END,
            name
          LIMIT ?
        `;
        params = [
          `%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`,
          `%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`,
          parseInt(limit)
        ];
    }

    const stores = await Database.all(sql, params);

    // 只回傳基本資料：店號、店名、電話、地址
    const processedStores = stores.map(store => ({
      id: store.id,
      name: store.name,
      tel: store.tel,
      address: store.address
    }));

    console.log(`✅ 找到 ${processedStores.length} 個門市`);

    res.json({
      stores: processedStores,
      total: processedStores.length,
      query: searchQuery,
      type
    });

  } catch (error) {
    console.error('❌ 搜尋門市失敗:', error);
    res.status(500).json({
      success: false,
      message: '搜尋門市失敗',
      error: error.message
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

module.exports = router;