#!/usr/bin/env node

/**
 * 修復重複的訂單號問題
 * 檢查並修復資料庫中可能存在的重複訂單號
 */

const Database = require('../config/database-universal');

async function generateUniqueOrderNumber() {
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    const millisecond = String(now.getMilliseconds()).padStart(3, '0');
    
    // 生成訂單號：ORD + 年 + 日 + 月 + 時 + 分 + 秒 + 毫秒前2位
    const orderNumber = `ORD${year}${day}${month}${hour}${minute}${second}${millisecond.substring(0, 2)}`;
    
    try {
      // 檢查訂單號是否已存在
      const existingOrder = await Database.get(
        'SELECT id FROM orders WHERE order_number = ?',
        [orderNumber]
      );
      
      if (!existingOrder) {
        return orderNumber;
      }
      
      attempts++;
      // 短暫延遲避免時間戳重複
      await new Promise(resolve => setTimeout(resolve, Math.random() * 10 + 1));
      
    } catch (error) {
      console.error('檢查訂單號唯一性時出錯:', error);
      attempts++;
    }
  }
  
  // 如果多次嘗試都失敗，添加隨機後綴
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');
  const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
  
  return `ORD${year}${day}${month}${hour}${minute}${second}${randomSuffix}`;
}

async function fixDuplicateOrderNumbers() {
  console.log('🚀 開始檢查和修復重複訂單號...');
  
  try {
    // 檢查是否有重複的訂單號
    const duplicates = await Database.all(`
      SELECT order_number, COUNT(*) as count 
      FROM orders 
      GROUP BY order_number 
      HAVING COUNT(*) > 1
    `);
    
    if (duplicates.length === 0) {
      console.log('✅ 沒有發現重複的訂單號');
      return;
    }
    
    console.log(`⚠️ 發現 ${duplicates.length} 個重複的訂單號:`);
    duplicates.forEach(dup => {
      console.log(`- ${dup.order_number}: ${dup.count} 個重複`);
    });
    
    // 修復每個重複的訂單號
    for (const duplicate of duplicates) {
      console.log(`\n🔧 修復訂單號: ${duplicate.order_number}`);
      
      // 獲取所有重複的訂單，按 ID 排序（保留最早的）
      const duplicateOrders = await Database.all(
        'SELECT * FROM orders WHERE order_number = ? ORDER BY id ASC',
        [duplicate.order_number]
      );
      
      console.log(`📋 找到 ${duplicateOrders.length} 個重複訂單`);
      
      // 保留第一個（最早的），修復其他的
      for (let i = 1; i < duplicateOrders.length; i++) {
        const order = duplicateOrders[i];
        const newOrderNumber = await generateUniqueOrderNumber();
        
        console.log(`🔄 更新訂單 ID ${order.id}: ${order.order_number} → ${newOrderNumber}`);
        
        await Database.run(
          'UPDATE orders SET order_number = ? WHERE id = ?',
          [newOrderNumber, order.id]
        );
        
        console.log(`✅ 訂單 ID ${order.id} 更新成功`);
      }
    }
    
    console.log('\n🎉 重複訂單號修復完成！');
    
    // 驗證修復結果
    const remainingDuplicates = await Database.all(`
      SELECT order_number, COUNT(*) as count 
      FROM orders 
      GROUP BY order_number 
      HAVING COUNT(*) > 1
    `);
    
    if (remainingDuplicates.length === 0) {
      console.log('✅ 驗證通過：所有訂單號現在都是唯一的');
    } else {
      console.log('❌ 仍有重複訂單號，需要手動檢查');
      remainingDuplicates.forEach(dup => {
        console.log(`- ${dup.order_number}: ${dup.count} 個重複`);
      });
    }
    
  } catch (error) {
    console.error('❌ 修復重複訂單號失敗:', error);
    throw error;
  }
}

// 允許直接執行
if (require.main === module) {
  fixDuplicateOrderNumbers()
    .then(() => {
      console.log('✅ 腳本執行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 腳本執行失敗:', error);
      process.exit(1);
    });
}

module.exports = fixDuplicateOrderNumbers;
