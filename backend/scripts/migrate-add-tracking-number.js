#!/usr/bin/env node

const Database = require('../config/database');

async function migrateAddTrackingNumber() {
  console.log('🚀 開始添加運輸單號字段...');
  
  try {
    // 檢查字段是否已存在
    const tableInfo = await Database.all("PRAGMA table_info(orders)");
    const hasTrackingNumber = tableInfo.some(column => column.name === 'tracking_number');
    
    if (hasTrackingNumber) {
      console.log('✅ tracking_number 字段已存在，跳過遷移');
      return;
    }
    
    // 添加tracking_number字段
    await Database.run(`
      ALTER TABLE orders 
      ADD COLUMN tracking_number TEXT DEFAULT NULL
    `);
    
    console.log('✅ 成功添加 tracking_number 字段到 orders 表');
    
    // 驗證字段是否添加成功
    const updatedTableInfo = await Database.all("PRAGMA table_info(orders)");
    const trackingField = updatedTableInfo.find(column => column.name === 'tracking_number');
    
    if (trackingField) {
      console.log('✅ 驗證成功：tracking_number 字段已正確添加');
      console.log('📋 字段信息：', trackingField);
    } else {
      throw new Error('字段添加失敗：無法找到 tracking_number 字段');
    }
    
    // 測試查詢現有訂單
    const orderCount = await Database.get("SELECT COUNT(*) as count FROM orders");
    console.log(`📊 現有訂單數量：${orderCount.count}`);
    
    if (orderCount.count > 0) {
      // 查詢前5個訂單，檢查新字段
      const sampleOrders = await Database.all(`
        SELECT id, order_number, tracking_number, status, created_at 
        FROM orders 
        ORDER BY created_at DESC 
        LIMIT 5
      `);
      
      console.log('📋 示例訂單（含新字段）：');
      sampleOrders.forEach(order => {
        console.log(`  - ${order.order_number}: tracking_number=${order.tracking_number || 'NULL'}`);
      });
    }
    
    console.log('🎉 運輸單號功能數據庫遷移完成！');
    
  } catch (error) {
    console.error('❌ 數據庫遷移失敗:', error);
    throw error;
  }
}

// 如果直接運行此腳本
if (require.main === module) {
  migrateAddTrackingNumber()
    .then(() => {
      console.log('✅ 遷移腳本執行完成');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ 遷移腳本執行失敗:', error);
      process.exit(1);
    });
}

module.exports = migrateAddTrackingNumber; 