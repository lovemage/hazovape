#!/usr/bin/env node

/**
 * 添加 telegram_sent 欄位到 orders 表
 * 修復訂單表缺失 telegram_sent 欄位問題
 */

const Database = require('../config/database');

async function addTelegramSentField() {
  console.log('🔧 開始添加 telegram_sent 欄位到 orders 表...\n');

  try {
    // 檢查是否為 PostgreSQL
    const isPostgreSQL = !!process.env.DATABASE_URL;
    console.log('📊 數據庫類型:', isPostgreSQL ? 'PostgreSQL' : 'SQLite');

    if (isPostgreSQL) {
      // PostgreSQL: 檢查欄位是否已存在
      const checkColumn = await Database.get(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'telegram_sent'
      `);

      if (checkColumn) {
        console.log('✅ telegram_sent 欄位已存在，無需添加');
        return;
      }

      // 添加欄位
      await Database.run(`
        ALTER TABLE orders 
        ADD COLUMN telegram_sent BOOLEAN DEFAULT false
      `);
      
      console.log('✅ PostgreSQL: telegram_sent 欄位添加成功');

    } else {
      // SQLite: 檢查欄位是否已存在
      const tableInfo = await Database.all('PRAGMA table_info(orders)');
      const hasColumn = tableInfo.some(col => col.name === 'telegram_sent');

      if (hasColumn) {
        console.log('✅ telegram_sent 欄位已存在，無需添加');
        return;
      }

      // 添加欄位
      await Database.run(`
        ALTER TABLE orders 
        ADD COLUMN telegram_sent BOOLEAN DEFAULT 0
      `);
      
      console.log('✅ SQLite: telegram_sent 欄位添加成功');
    }

    // 驗證欄位添加成功
    const testQuery = await Database.get('SELECT telegram_sent FROM orders LIMIT 1');
    console.log('✅ 欄位驗證成功');

    // 為現有訂單設置默認值
    const updateResult = await Database.run('UPDATE orders SET telegram_sent = ? WHERE telegram_sent IS NULL', [false]);
    console.log(`✅ 已更新 ${updateResult.changes || 0} 條現有訂單記錄`);

    console.log('\n🎉 telegram_sent 欄位添加完成！');

  } catch (error) {
    console.error('❌ 添加 telegram_sent 欄位失敗:', error);
    throw error;
  }
}

// 如果直接執行此腳本
if (require.main === module) {
  addTelegramSentField()
    .then(() => {
      console.log('✅ 數據庫遷移完成');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ 數據庫遷移失敗:', error);
      process.exit(1);
    });
}

module.exports = addTelegramSentField;