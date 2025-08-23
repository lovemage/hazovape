const express = require('express');
const router = express.Router();
const Database = require('../config/database');

// 獲取所有設置
router.get('/', async (req, res) => {
  try {
    console.log('📋 獲取網站設置...');

    // 默認設置
    const defaultSettingsMap = {
      'free_shipping_threshold': '3000',
      'shipping_fee': '60',
      'site_title': 'Mist Mall',
      'site_subtitle': '精選優質茶葉、咖啡豆與手工餅乾，為您帶來最美好的味覺體驗',
      'contact_line': 'https://line.me/ti/p/euNh8K-s3e',
      'contact_telegram': 't.me/edward0521',
      'contact_phone': '',
      'contact_email': '',
      'homepage_subtitle': '精選優質茶葉、咖啡豆與手工餅乾，為您帶來最美好的味覺體驗',
      'popup_image': '/uploads/static/unlock-popup.png',
      'popup_enabled': 'true',
      'order_complete_popup_image': '/uploads/static/unlock-popup.png',
      'order_complete_popup_enabled': 'true',
      'hero_background_image': '/images/seep-vape-hero.png',
      'floating_buttons_enabled': 'true'
    };

    try {
      // 從 site_settings 表讀取設置
      const dbSettings = await Database.all('SELECT setting_key, setting_value FROM site_settings');
      
      // 合併數據庫設置和默認設置
      const settingsMap = { ...defaultSettingsMap };
      dbSettings.forEach(setting => {
        settingsMap[setting.setting_key] = setting.setting_value;
      });

      console.log('✅ 從數據庫加載設置成功，共', dbSettings.length, '個設置');
      console.log('✅ 最終設置映射:', settingsMap);
      return res.json({
        success: true,
        data: settingsMap,
        raw: dbSettings
      });

    } catch (error) {
      console.log('⚠️ 無法從數據庫讀取設置，使用默認值:', error.message);
      // 如果數據庫出錯，返回默認設置
      return res.json({
        success: true,
        data: defaultSettingsMap,
        raw: []
      });
    }
  } catch (error) {
    console.error('❌ 獲取網站設置失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取設置失敗',
      error: error.message
    });
  }
});

// 獲取設置分類（必須在 /:key 之前）
router.get('/categories/list', async (req, res) => {
  try {
    console.log('📋 獲取設置分類...');
    // 暫時禁用數據庫查詢，返回空數組
    const categories = [];

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('❌ 獲取設置分類失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取分類失敗',
      error: error.message
    });
  }
});

// 獲取特定設置
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    console.log('📋 獲取設置:', key);

    // 預設值
    const defaultSettings = {
      'free_shipping_threshold': '3000',
      'shipping_fee': '60',
      'site_title': 'Mist Mall',
      'site_subtitle': '精選優質茶葉、咖啡豆與手工餅乾，為您帶來最美好的味覺體驗',
      'contact_line': 'https://line.me/ti/p/euNh8K-s3e',
      'contact_telegram': 't.me/edward0521',
      'homepage_subtitle': '精選優質茶葉、咖啡豆與手工餅乾，為您帶來最美好的味覺體驗',
      'site_description': '優質商品購物平台',
      'contact_phone': '',
      'contact_email': '',
      'popup_image': '/uploads/static/unlock-popup.png',
      'order_complete_popup_image': '/uploads/static/unlock-popup.png',
      'hero_background_image': '/images/seep-vape-hero.png',
      'floating_buttons_enabled': 'true'
    };

    let setting;
    
    try {
      // 先嘗試從資料庫讀取
      const dbSetting = await Database.get('SELECT setting_key, setting_value FROM site_settings WHERE setting_key = ?', [key]);
      
      if (dbSetting) {
        setting = {
          key: key,
          value: dbSetting.setting_value,
          type: 'text'
        };
        console.log('✅ 從資料庫讀取設置:', key, '=', dbSetting.setting_value);
      } else {
        // 如果資料庫沒有，使用預設值
        setting = {
          key: key,
          value: defaultSettings[key] || '',
          type: 'text'
        };
        console.log('📋 使用預設設置值:', key, '=', defaultSettings[key]);
      }
    } catch (dbError) {
      console.log('⚠️ 資料庫查詢失敗，使用預設值:', dbError.message);
      setting = {
        key: key,
        value: defaultSettings[key] || '',
        type: 'text'
      };
    }

    if (!setting.value && !defaultSettings[key]) {
      return res.status(404).json({
        success: false,
        message: '設置不存在'
      });
    }
    
    let value = setting.value;

    // 根據類型轉換值
    if (setting.type === 'number') {
      value = parseFloat(value) || 0;
    } else if (setting.type === 'boolean') {
      value = value === 'true' || value === '1';
    } else if (setting.type === 'json') {
      try {
        value = JSON.parse(value);
      } catch (e) {
        value = {};
      }
    }
    
    res.json({
      success: true,
      data: {
        key: key,
        value: value,
        type: setting.type
      }
    });
  } catch (error) {
    console.error('❌ 獲取設置失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取設置失敗',
      error: error.message
    });
  }
});

// 更新設置
router.put('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    
    console.log('📝 更新設置:', key, '值:', value);
    
    // 暫時禁用設置更新功能，避免數據庫錯誤
    console.log('⚠️  設置更新功能暫時禁用');
    return res.status(501).json({
      success: false,
      message: '設置更新功能暫時禁用'
    });
    
    // 根據類型處理值
    let processedValue = value;
    if (existingSetting.setting_type === 'json') {
      processedValue = typeof value === 'string' ? value : JSON.stringify(value);
    } else if (existingSetting.setting_type === 'boolean') {
      processedValue = value ? '1' : '0';
    } else {
      processedValue = String(value);
    }
    
    // 更新設置
    await Database.run(`
      UPDATE site_settings
      SET value = ?
      WHERE \`key\` = ?
    `, [processedValue, key]);
    
    console.log('✅ 設置更新成功:', key);
    res.json({
      success: true,
      message: '設置更新成功',
      data: {
        key: key,
        value: value
      }
    });
  } catch (error) {
    console.error('❌ 更新設置失敗:', error);
    res.status(500).json({
      success: false,
      message: '更新設置失敗',
      error: error.message
    });
  }
});

// 批量更新設置
router.put('/', async (req, res) => {
  try {
    const { settings } = req.body;
    
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        success: false,
        message: '無效的設置數據'
      });
    }

    console.log('📝 批量更新設置:', Object.keys(settings).length, '個項目');

    // 檢查數據庫類型並正確處理事務
    const isPostgreSQL = !!process.env.DATABASE_URL;
    let client = null;

    try {
      if (isPostgreSQL) {
        // PostgreSQL 事務處理
        client = await Database.beginTransaction();
      } else {
        // SQLite 事務處理
        await Database.beginTransaction();
      }

      for (const [key, value] of Object.entries(settings)) {
        // 檢查設置是否存在
        const existing = await Database.get(
          'SELECT id FROM site_settings WHERE setting_key = ?',
          [key]
        );

        if (existing) {
          // 更新現有設置
          await Database.run(
            'UPDATE site_settings SET setting_value = ?, updated_at = CURRENT_TIMESTAMP WHERE setting_key = ?',
            [String(value), key]
          );
        } else {
          // 插入新設置
          await Database.run(
            'INSERT INTO site_settings (setting_key, setting_value, description, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
            [key, String(value), '']
          );
        }
      }

      if (isPostgreSQL) {
        await Database.commit(client);
      } else {
        await Database.commit();
      }

      console.log('✅ 批量設置更新成功');
      res.json({
        success: true,
        message: '設置更新成功'
      });

    } catch (error) {
      console.error('❌ 事務執行失敗:', error);
      
      if (isPostgreSQL && client) {
        await Database.rollback(client);
      } else if (!isPostgreSQL) {
        await Database.rollback();
      }
      
      throw error;
    }

  } catch (error) {
    console.error('❌ 批量更新設置失敗:', error);
    res.status(500).json({
      success: false,
      message: '更新設置失敗',
      error: error.message
    });
  }
});

module.exports = router;
