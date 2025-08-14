#!/usr/bin/env node

const Database = require('../config/database');
const fs = require('fs');
const path = require('path');

async function checkDatabaseStatus() {
  try {
    console.log('🔍 檢查數據庫狀態...');
    console.log('📁 當前工作目錄:', process.cwd());
    console.log('🌍 環境:', process.env.NODE_ENV || 'development');
    
    // 檢查數據庫文件
    const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../data/mistmall.db');
    console.log('📍 數據庫路徑:', dbPath);
    console.log('📄 數據庫文件存在:', fs.existsSync(dbPath));
    
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath);
      console.log('📊 數據庫文件大小:', Math.round(stats.size / 1024), 'KB');
      console.log('📅 最後修改時間:', stats.mtime.toISOString());
    }

    // 檢查表和數據量
    console.log('\n📋 數據庫表狀態:');
    
    // 檢查管理員用戶
    try {
      const adminCount = await Database.get('SELECT COUNT(*) as count FROM admin_users');
      const adminUsers = await Database.all('SELECT id, username, created_at FROM admin_users');
      console.log(`👥 管理員用戶: ${adminCount.count} 個`);
      adminUsers.forEach(user => {
        console.log(`  - ID: ${user.id}, 用戶名: ${user.username}, 創建時間: ${user.created_at}`);
      });
    } catch (error) {
      console.log('❌ admin_users 表:', error.message);
    }

    // 檢查商品
    try {
      const productCount = await Database.get('SELECT COUNT(*) as count FROM products');
      console.log(`📦 商品數量: ${productCount.count} 個`);
    } catch (error) {
      console.log('❌ products 表:', error.message);
    }

    // 檢查訂單
    try {
      const orderCount = await Database.get('SELECT COUNT(*) as count FROM orders');
      const recentOrders = await Database.all(`
        SELECT order_number, customer_name, total_amount, created_at 
        FROM orders 
        ORDER BY created_at DESC 
        LIMIT 5
      `);
      console.log(`📋 訂單數量: ${orderCount.count} 個`);
      if (recentOrders.length > 0) {
        console.log('最近 5 筆訂單:');
        recentOrders.forEach(order => {
          console.log(`  - ${order.order_number}: ${order.customer_name} - NT$${order.total_amount} (${order.created_at})`);
        });
      }
    } catch (error) {
      console.log('❌ orders 表:', error.message);
    }

    // 檢查系統設定
    try {
      const settings = await Database.all('SELECT setting_key, setting_value FROM system_settings');
      console.log(`⚙️  系統設定: ${settings.length} 個`);
      settings.forEach(setting => {
        console.log(`  - ${setting.setting_key}: ${setting.setting_value}`);
      });
    } catch (error) {
      console.log('❌ system_settings 表:', error.message);
    }

    // 檢查門市
    try {
      const storeCount = await Database.get('SELECT COUNT(*) as count FROM stores');
      console.log(`🏪 門市數量: ${storeCount.count} 個`);
    } catch (error) {
      console.log('❌ stores 表:', error.message);
    }

    // 檢查規格/口味
    try {
      const flavorCount = await Database.get('SELECT COUNT(*) as count FROM flavors');
      console.log(`🎯 規格/口味數量: ${flavorCount.count} 個`);
    } catch (error) {
      console.log('❌ flavors 表:', error.message);
    }

    console.log('\n✅ 數據庫狀態檢查完成');

  } catch (error) {
    console.error('❌ 檢查數據庫狀態失敗:', error);
  }
}

// 如果直接執行此腳本
if (require.main === module) {
  checkDatabaseStatus().then(() => {
    console.log('✅ 腳本執行完成');
    process.exit(0);
  }).catch(error => {
    console.error('❌ 腳本執行失敗:', error);
    process.exit(1);
  });
}

module.exports = checkDatabaseStatus;