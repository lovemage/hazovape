#!/usr/bin/env node

/**
 * Telegram Bot 測試腳本
 * 用於診斷 Telegram 通知問題
 */

const TelegramBot = require('node-telegram-bot-api');

async function testTelegramConfig() {
  console.log('🔍 開始 Telegram 配置診斷...\n');

  // 檢查環境變數
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const enabled = process.env.TELEGRAM_ENABLED;

  console.log('📋 環境變數檢查:');
  console.log(`- TELEGRAM_BOT_TOKEN: ${token ? `已設置 (${token.substring(0, 10)}...)` : '❌ 未設置'}`);
  console.log(`- TELEGRAM_CHAT_ID: ${chatId || '❌ 未設置'}`);
  console.log(`- TELEGRAM_ENABLED: ${enabled || '❌ 未設置'}\n`);

  if (!token || !chatId) {
    console.log('❌ 基本配置缺失！');
    console.log('\n💡 解決方案:');
    console.log('1. 設置環境變數:');
    console.log('   export TELEGRAM_BOT_TOKEN="你的_bot_token"');
    console.log('   export TELEGRAM_CHAT_ID="你的_chat_id"');
    console.log('   export TELEGRAM_ENABLED="true"');
    console.log('\n2. 或者在 Railway Dashboard 中設置這些環境變數');
    console.log('\n3. 重新啟動應用');
    return;
  }

  console.log('✅ 基本配置正確，開始測試連接...\n');

  try {
    const bot = new TelegramBot(token, { polling: false });
    
    // 測試 Bot 信息
    console.log('🤖 獲取 Bot 信息...');
    const botInfo = await bot.getMe();
    console.log(`   Bot 名稱: ${botInfo.first_name} (@${botInfo.username})`);
    console.log(`   Bot ID: ${botInfo.id}\n`);

    // 測試發送消息
    console.log('💬 發送測試消息...');
    const testMessage = `🧪 Hazo Telegram 測試
    
✅ Bot 連接成功！
🕐 測試時間: ${new Date().toLocaleString('zh-TW')}
📱 Chat ID: ${chatId}
🤖 Bot: @${botInfo.username}

如果您看到這條消息，表示 Telegram 通知功能正常運作！`;

    const result = await bot.sendMessage(chatId, testMessage);
    console.log('✅ 測試消息發送成功！');
    console.log(`   消息 ID: ${result.message_id}`);
    console.log(`   發送時間: ${new Date(result.date * 1000).toLocaleString('zh-TW')}\n`);

    console.log('🎉 Telegram 配置完全正常！');

  } catch (error) {
    console.log('❌ Telegram 測試失敗:');
    console.log(`   錯誤類型: ${error.name}`);
    console.log(`   錯誤消息: ${error.message}\n`);

    if (error.response) {
      const errorData = error.response.body;
      console.log('📱 Telegram API 錯誤詳情:');
      console.log(`   錯誤代碼: ${errorData.error_code}`);
      console.log(`   錯誤描述: ${errorData.description}\n`);

      // 常見錯誤診斷
      switch (errorData.error_code) {
        case 400:
          console.log('💡 可能原因: Chat ID 格式錯誤或 Bot Token 無效');
          console.log('   解決方案:');
          console.log('   1. 檢查 Chat ID 是否正確');
          console.log('   2. 確認已與 Bot 發送過消息');
          break;
        case 401:
          console.log('💡 可能原因: Bot Token 無效或已過期');
          console.log('   解決方案:');
          console.log('   1. 重新檢查 Bot Token');
          console.log('   2. 聯繫 @BotFather 確認 Bot 狀態');
          break;
        case 403:
          console.log('💡 可能原因: Bot 被用戶阻擋或沒有發送權限');
          console.log('   解決方案:');
          console.log('   1. 確認已與 Bot 發送過 /start 消息');
          console.log('   2. 檢查是否意外阻擋了 Bot');
          break;
        default:
          console.log('💡 其他錯誤，請檢查網絡連接和配置');
      }
    } else {
      console.log('💡 網絡錯誤或其他問題，請檢查:');
      console.log('   1. 網絡連接是否正常');
      console.log('   2. Bot Token 格式是否正確');
      console.log('   3. 是否有防火牆阻擋');
    }
  }
}

// 如果直接執行此腳本
if (require.main === module) {
  testTelegramConfig().catch(console.error);
}

module.exports = testTelegramConfig;