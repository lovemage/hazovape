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

    // 3. 插入範例加購商品
    console.log('📦 插入範例加購商品...');
    
    const sampleProducts = [
      {
        name: '精選茶包組合',
        price: 99.00,
        stock: 50,
        description: '多種口味茶包，隨時享受好茶',
        images: '[]',
        sort_order: 1
      },
      {
        name: '便攜保溫杯',
        price: 199.00,
        stock: 30,
        description: '304不鏽鋼，保溫6小時',
        images: '[]',
        sort_order: 2
      },
      {
        name: '手工餅乾禮盒',
        price: 149.00,
        stock: 25,
        description: '酥脆香甜，茶點首選',
        images: '[]',
        sort_order: 3
      },
      {
        name: '蜂蜜檸檬片',
        price: 79.00,
        stock: 40,
        description: '天然蜂蜜製作，泡茶好夥伴',
        images: '[]',
        sort_order: 4
      }
    ];

    for (const product of sampleProducts) {
      await Database.run(`
        INSERT OR IGNORE INTO upsell_products 
        (name, price, stock, description, images, sort_order, is_active)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `, [
        product.name,
        product.price,
        product.stock,
        product.description,
        product.images,
        product.sort_order
      ]);
    }
    
    console.log('✅ 範例加購商品插入成功');

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
