#!/usr/bin/env node

// 清理加購商品範例數據腳本
const Database = require('../config/database');

async function cleanUpsellSamples() {
  try {
    console.log('🧹 開始清理加購商品範例數據...');
    
    // 刪除範例商品（根據名稱識別）
    const sampleNames = [
      '精選茶包組合',
      '便攜保溫杯', 
      '手工餅乾禮盒',
      '蜂蜜檸檬片'
    ];
    
    let deletedCount = 0;
    for (const name of sampleNames) {
      const result = await Database.run(
        'DELETE FROM upsell_products WHERE name = ?',
        [name]
      );
      if (result.changes > 0) {
        console.log(`🗑️  已刪除範例商品: ${name} (${result.changes} 筆)`);
        deletedCount += result.changes;
      }
    }
    
    if (deletedCount > 0) {
      console.log(`✅ 清理完成，共刪除 ${deletedCount} 個範例商品`);
    } else {
      console.log('✅ 沒有找到範例商品，無需清理');
    }
    
    // 驗證清理結果
    const remainingCount = await Database.get('SELECT COUNT(*) as count FROM upsell_products');
    console.log(`📊 剩餘加購商品數量: ${remainingCount.count}`);
    
  } catch (error) {
    console.error('❌ 清理過程中發生錯誤:', error);
    process.exit(1);
  } finally {
    await Database.close();
  }
}

// 只在直接運行時執行清理
if (require.main === module) {
  cleanUpsellSamples();
}

module.exports = cleanUpsellSamples;