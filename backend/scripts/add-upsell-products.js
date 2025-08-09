#!/usr/bin/env node

// 加購商品功能數據庫遷移腳本
const Database = require('../config/database');

async function addUpsellProducts() {
  try {
    console.log('🚀 開始加購商品功能數據庫遷移...');
    
    // 1. 創建加購商品表
    console.log('📋 創建加購商品表...');
    await Database.run(`
      CREATE TABLE IF NOT EXISTS upsell_products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        stock INTEGER DEFAULT 0,
        images TEXT DEFAULT '[]',
        description TEXT,
        is_active BOOLEAN DEFAULT 1,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ 加購商品表創建成功');

    // 2. 檢查 order_items 表是否已有加購相關字段
    console.log('🔍 檢查訂單項目表結構...');
    const tableInfo = await Database.all("PRAGMA table_info(order_items)");
    const hasUpsellFields = tableInfo.some(col => col.name === 'is_upsell');
    
    if (!hasUpsellFields) {
      console.log('📝 添加加購商品相關字段到訂單項目表...');
      await Database.run('ALTER TABLE order_items ADD COLUMN is_upsell BOOLEAN DEFAULT 0');
      await Database.run('ALTER TABLE order_items ADD COLUMN upsell_product_id INTEGER');
      console.log('✅ 訂單項目表字段添加成功');
    } else {
      console.log('✅ 訂單項目表字段已存在，跳過添加');
    }

    // 3. 不插入任何範例商品，保持資料表為空
    console.log('✅ 加購商品表已準備就緒，無範例商品插入');

    // 4. 驗證創建結果
    console.log('🔍 驗證創建結果...');
    const upsellCount = await Database.get('SELECT COUNT(*) as count FROM upsell_products');
    console.log(`📊 加購商品數量: ${upsellCount.count}`);

    console.log('🎉 加購商品功能數據庫遷移完成！');
    
  } catch (error) {
    console.error('❌ 遷移過程中發生錯誤:', error);
    process.exit(1);
  } finally {
    await Database.close();
  }
}

// 只在直接運行時執行遷移
if (require.main === module) {
  addUpsellProducts();
}

module.exports = addUpsellProducts;
