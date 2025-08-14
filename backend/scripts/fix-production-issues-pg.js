#!/usr/bin/env node

const Database = require('../config/database');

async function fixProductionIssues() {
  console.log('🔧 開始修復 PostgreSQL 生產環境問題...');

  try {
    // 1. 檢查並添加 orders 表的優惠券相關欄位
    console.log('📋 檢查 orders 表結構...');
    
    try {
      // 檢查是否有 coupon_id 欄位
      const couponIdColumn = await Database.get(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'coupon_id'
      `);
      
      if (!couponIdColumn) {
        console.log('🧩 為 orders 表新增 coupon_id 欄位');
        await Database.run(`ALTER TABLE orders ADD COLUMN coupon_id INTEGER`);
        console.log('✅ coupon_id 欄位新增完成');
      } else {
        console.log('✅ coupon_id 欄位已存在');
      }
    } catch (err) {
      console.log('⚠️ coupon_id 欄位檢查失敗，可能已存在:', err.message);
    }

    try {
      // 檢查是否有 coupon_code 欄位
      const couponCodeColumn = await Database.get(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'coupon_code'
      `);
      
      if (!couponCodeColumn) {
        console.log('🧩 為 orders 表新增 coupon_code 欄位');
        await Database.run(`ALTER TABLE orders ADD COLUMN coupon_code TEXT`);
        console.log('✅ coupon_code 欄位新增完成');
      } else {
        console.log('✅ coupon_code 欄位已存在');
      }
    } catch (err) {
      console.log('⚠️ coupon_code 欄位檢查失敗，可能已存在:', err.message);
    }

    try {
      // 檢查是否有 discount_amount 欄位  
      const discountAmountColumn = await Database.get(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'discount_amount'
      `);
      
      if (!discountAmountColumn) {
        console.log('🧩 為 orders 表新增 discount_amount 欄位');
        await Database.run(`ALTER TABLE orders ADD COLUMN discount_amount INTEGER DEFAULT 0`);
        console.log('✅ discount_amount 欄位新增完成');
      } else {
        console.log('✅ discount_amount 欄位已存在');
      }
    } catch (err) {
      console.log('⚠️ discount_amount 欄位檢查失敗，可能已存在:', err.message);
    }

    // 2. 檢查並創建 coupons 表
    console.log('📋 檢查 coupons 表...');
    try {
      const couponsTable = await Database.get(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'coupons'
      `);

      if (!couponsTable) {
        console.log('🧱 建立 coupons 表');
        await Database.run(`
          CREATE TABLE IF NOT EXISTS coupons (
            id SERIAL PRIMARY KEY,
            code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            type TEXT NOT NULL,
            value INTEGER NOT NULL,
            min_order_amount INTEGER DEFAULT 0,
            max_discount INTEGER,
            usage_limit INTEGER,
            used_count INTEGER DEFAULT 0,
            per_user_limit INTEGER DEFAULT 1,
            valid_from TEXT NOT NULL,
            valid_until TEXT NOT NULL,
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        await Database.run(`CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code)`);
        console.log('✅ coupons 表建立完成');
      } else {
        console.log('✅ coupons 表已存在');
      }
    } catch (err) {
      console.log('⚠️ coupons 表操作失敗:', err.message);
    }

    // 3. 檢查並創建 coupon_usages 表
    console.log('📋 檢查 coupon_usages 表...');
    try {
      const usagesTable = await Database.get(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'coupon_usages'
      `);

      if (!usagesTable) {
        console.log('🧱 建立 coupon_usages 表');
        await Database.run(`
          CREATE TABLE IF NOT EXISTS coupon_usages (
            id SERIAL PRIMARY KEY,
            coupon_id INTEGER NOT NULL,
            order_id INTEGER NOT NULL,
            customer_phone TEXT NOT NULL,
            discount_amount INTEGER NOT NULL DEFAULT 0,
            used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (coupon_id) REFERENCES coupons(id),
            FOREIGN KEY (order_id) REFERENCES orders(id)
          )
        `);
        await Database.run(`CREATE INDEX IF NOT EXISTS idx_coupon_usages_coupon_id ON coupon_usages(coupon_id)`);
        await Database.run(`CREATE INDEX IF NOT EXISTS idx_coupon_usages_order_id ON coupon_usages(order_id)`);
        console.log('✅ coupon_usages 表建立完成');
      } else {
        console.log('✅ coupon_usages 表已存在');
      }
    } catch (err) {
      console.log('⚠️ coupon_usages 表操作失敗:', err.message);
    }

    // 4. 檢查並創建 upsell_products 表
    console.log('📋 檢查 upsell_products 表...');
    try {
      const upsellTable = await Database.get(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'upsell_products'
      `);

      if (!upsellTable) {
        console.log('🧱 建立 upsell_products 表');
        await Database.run(`
          CREATE TABLE IF NOT EXISTS upsell_products (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            price DECIMAL(10,2) NOT NULL,
            stock INTEGER DEFAULT 0,
            images TEXT DEFAULT '[]',
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log('✅ upsell_products 表建立完成');

        // 插入一些範例加購商品
        console.log('📝 插入範例加購商品...');
        const sampleUpsells = [
          ['充電線組合', '多種接頭充電線組合包', 59, 100, '[]'],
          ['手機支架', '桌面手機支架', 39, 150, '[]'], 
          ['清潔用品', '手機清潔組合', 29, 200, '[]']
        ];

        for (const [name, description, price, stock, images] of sampleUpsells) {
          await Database.run(`
            INSERT INTO upsell_products (name, description, price, stock, images, is_active)
            VALUES ($1, $2, $3, $4, $5, true)
          `, [name, description, price, stock, images]);
        }
        console.log('✅ 範例加購商品插入完成');
      } else {
        console.log('✅ upsell_products 表已存在');
      }
    } catch (err) {
      console.log('⚠️ upsell_products 表操作失敗:', err.message);
    }

    // 5. 檢查並添加 order_items 表的 upsell 相關欄位
    console.log('📋 檢查 order_items 表結構...');

    try {
      // 檢查是否有 upsell_product_id 欄位
      const upsellProductIdColumn = await Database.get(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'order_items' AND column_name = 'upsell_product_id'
      `);
      
      if (!upsellProductIdColumn) {
        console.log('🧩 為 order_items 表新增 upsell_product_id 欄位');
        await Database.run(`ALTER TABLE order_items ADD COLUMN upsell_product_id INTEGER`);
        console.log('✅ upsell_product_id 欄位新增完成');
      } else {
        console.log('✅ upsell_product_id 欄位已存在');
      }
    } catch (err) {
      console.log('⚠️ upsell_product_id 欄位檢查失敗，可能已存在:', err.message);
    }

    try {
      // 檢查是否有 is_upsell 欄位
      const isUpsellColumn = await Database.get(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'order_items' AND column_name = 'is_upsell'
      `);
      
      if (!isUpsellColumn) {
        console.log('🧩 為 order_items 表新增 is_upsell 欄位');
        await Database.run(`ALTER TABLE order_items ADD COLUMN is_upsell BOOLEAN DEFAULT false`);
        console.log('✅ is_upsell 欄位新增完成');
      } else {
        console.log('✅ is_upsell 欄位已存在');
      }
    } catch (err) {
      console.log('⚠️ is_upsell 欄位檢查失敗，可能已存在:', err.message);
    }

    // 6. 最終檢查
    console.log('📊 修復完成，檢查結果...');
    try {
      const finalCheck = {
        orders: await Database.get('SELECT COUNT(*) as count FROM orders'),
        upsell_products: await Database.get('SELECT COUNT(*) as count FROM upsell_products'),
        order_items: await Database.get('SELECT COUNT(*) as count FROM order_items')
      };

      console.log('📈 數據統計:');
      console.log(`   訂單: ${finalCheck.orders.count} 個`);
      console.log(`   加購商品: ${finalCheck.upsell_products.count} 個`);
      console.log(`   訂單項目: ${finalCheck.order_items.count} 個`);

      // 嘗試檢查優惠券相關表
      try {
        const couponsCheck = await Database.get('SELECT COUNT(*) as count FROM coupons');
        const couponUsagesCheck = await Database.get('SELECT COUNT(*) as count FROM coupon_usages');
        console.log(`   優惠券: ${couponsCheck.count} 個`);
        console.log(`   優惠券使用記錄: ${couponUsagesCheck.count} 個`);
      } catch (err) {
        console.log('⚠️ 優惠券表統計失敗，但這可能是正常的');
      }

      console.log('🎉 PostgreSQL 生產環境問題修復完成！');
    } catch (err) {
      console.log('⚠️ 最終檢查失敗:', err.message);
      console.log('🎉 修復腳本完成（可能部分功能有限制）');
    }

  } catch (error) {
    console.error('❌ 修復失敗:', error);
    throw error;
  }
}

// 如果直接運行此腳本
if (require.main === module) {
  fixProductionIssues()
    .then(() => {
      console.log('✅ 修復腳本執行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 修復腳本執行失敗:', error);
      process.exit(1);
    });
}

module.exports = fixProductionIssues;