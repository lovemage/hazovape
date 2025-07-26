#!/usr/bin/env node

/**
 * 數據庫遷移腳本 - 添加網站設置表
 * 用於在現有數據庫中安全地添加新的設置表
 */

const Database = require('../config/database');

async function migrateSettings() {
  try {
    console.log('🔄 開始設置表遷移...');
    
    // 檢查設置表是否存在
    const tableExists = await Database.get(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='site_settings'
    `);
    
    if (tableExists) {
      console.log('✅ 設置表已存在，檢查數據...');
      
      // 檢查設置數據
      const settingsCount = await Database.get('SELECT COUNT(*) as count FROM site_settings');
      console.log(`📊 現有設置數量: ${settingsCount.count}`);
      
      if (settingsCount.count === 0) {
        console.log('📝 插入初始設置數據...');
        await insertInitialSettings();
      }
      
      return;
    }
    
    console.log('🆕 創建設置表...');
    
    // 創建設置表
    await Database.run(`
      CREATE TABLE site_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        setting_key TEXT UNIQUE NOT NULL,
        setting_value TEXT,
        setting_type TEXT DEFAULT 'text',
        description TEXT,
        category TEXT DEFAULT 'general',
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ 設置表創建成功');
    
    // 插入初始設置
    console.log('📝 插入初始設置數據...');
    await insertInitialSettings();
    
    console.log('🎉 設置表遷移完成！');
    
  } catch (error) {
    console.error('❌ 設置表遷移失敗:', error);
    throw error;
  }
}

async function insertInitialSettings() {
  const initialSettings = [
    {
      key: 'homepage_subtitle',
      value: '精選優質茶葉、咖啡豆與手工餅乾，為您帶來最美好的味覺體驗',
      type: 'text',
      description: '首頁副標題',
      category: 'homepage'
    },
    {
      key: 'site_title',
      value: 'Mist Mall',
      type: 'text',
      description: '網站標題',
      category: 'general'
    },
    {
      key: 'site_description',
      value: '優質商品購物平台',
      type: 'text',
      description: '網站描述',
      category: 'general'
    },
    {
      key: 'contact_phone',
      value: '',
      type: 'text',
      description: '聯絡電話',
      category: 'contact'
    },
    {
      key: 'contact_email',
      value: '',
      type: 'text',
      description: '聯絡信箱',
      category: 'contact'
    }
  ];
  
  for (const setting of initialSettings) {
    try {
      await Database.run(`
        INSERT OR IGNORE INTO site_settings 
        (setting_key, setting_value, setting_type, description, category) 
        VALUES (?, ?, ?, ?, ?)
      `, [setting.key, setting.value, setting.type, setting.description, setting.category]);
      
      console.log(`✅ 插入設置: ${setting.key}`);
    } catch (error) {
      console.error(`❌ 插入設置失敗 ${setting.key}:`, error);
    }
  }
}

// 如果直接運行此腳本
if (require.main === module) {
  migrateSettings().then(() => {
    console.log('✅ 遷移完成');
    process.exit(0);
  }).catch(error => {
    console.error('❌ 遷移失敗:', error);
    process.exit(1);
  });
}

module.exports = { migrateSettings };
