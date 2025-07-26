const Database = require('../config/database');

async function addTelegramSettings() {
  try {
    console.log('添加Telegram設置表...');
    
    // 創建系統設置表
    await Database.run(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        setting_key TEXT UNIQUE NOT NULL,
        setting_value TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('系統設置表創建成功');
    
    // 插入Telegram設置的默認值
    const telegramSettings = [
      {
        key: 'telegram_bot_token',
        value: '',
        description: 'Telegram Bot Token'
      },
      {
        key: 'telegram_chat_id',
        value: '',
        description: 'Telegram Chat ID'
      },
      {
        key: 'telegram_enabled',
        value: 'false',
        description: '是否啟用Telegram通知'
      }
    ];
    
    for (const setting of telegramSettings) {
      // 檢查設置是否已存在
      const existing = await Database.get(
        'SELECT * FROM system_settings WHERE setting_key = ?',
        [setting.key]
      );
      
      if (!existing) {
        await Database.run(
          'INSERT INTO system_settings (setting_key, setting_value, description) VALUES (?, ?, ?)',
          [setting.key, setting.value, setting.description]
        );
        console.log(`添加設置: ${setting.key}`);
      } else {
        console.log(`設置已存在: ${setting.key}`);
      }
    }
    
    console.log('Telegram設置初始化完成');
    
    // 顯示當前設置
    const settings = await Database.all('SELECT * FROM system_settings');
    console.log('\n當前系統設置:');
    settings.forEach(setting => {
      console.log(`- ${setting.setting_key}: ${setting.setting_value || '(未設置)'} - ${setting.description}`);
    });
    
  } catch (error) {
    console.error('添加Telegram設置失敗:', error);
    throw error;
  }
}

// 如果直接運行此腳本
if (require.main === module) {
  addTelegramSettings().then(() => {
    console.log('腳本執行完成');
    process.exit(0);
  }).catch(err => {
    console.error('腳本執行失敗:', err);
    process.exit(1);
  });
}

module.exports = addTelegramSettings;
