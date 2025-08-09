#!/usr/bin/env node

const Database = require('../config/database');

async function migrateAddCoupons() {
  console.log('🚀 開始添加優惠券相關資料表與欄位...');

  try {
    // 1) 建立 coupons 表（若不存在）
    const couponsTable = await Database.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='coupons'"
    );

    if (!couponsTable) {
      console.log('🧱 建立 coupons 表');
      await Database.run(`
        CREATE TABLE IF NOT EXISTS coupons (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
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
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await Database.run(`CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code)`);
      console.log('✅ 完成建立 coupons 表');
    } else {
      console.log('✅ coupons 表已存在，跳過建立');
    }

    // 2) 建立 coupon_usages 表（若不存在）
    const usagesTable = await Database.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='coupon_usages'"
    );

    if (!usagesTable) {
      console.log('🧱 建立 coupon_usages 表');
      await Database.run(`
        CREATE TABLE IF NOT EXISTS coupon_usages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          coupon_id INTEGER NOT NULL,
          order_id INTEGER NOT NULL,
          customer_phone TEXT NOT NULL,
          discount_amount INTEGER NOT NULL DEFAULT 0,
          used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (coupon_id) REFERENCES coupons(id),
          FOREIGN KEY (order_id) REFERENCES orders(id)
        )
      `);
      await Database.run(`CREATE INDEX IF NOT EXISTS idx_coupon_usages_coupon_id ON coupon_usages(coupon_id)`);
      await Database.run(`CREATE INDEX IF NOT EXISTS idx_coupon_usages_order_id ON coupon_usages(order_id)`);
      console.log('✅ 完成建立 coupon_usages 表');
    } else {
      console.log('✅ coupon_usages 表已存在，跳過建立');
    }

    // 3) 為 orders 表新增與優惠券相關欄位（若不存在）
    const ordersInfo = await Database.all("PRAGMA table_info(orders)");
    const hasCouponId = ordersInfo.some(col => col.name === 'coupon_id');
    const hasCouponCode = ordersInfo.some(col => col.name === 'coupon_code');
    const hasDiscountAmount = ordersInfo.some(col => col.name === 'discount_amount');

    if (!hasCouponId) {
      console.log('🧩 為 orders 表新增 coupon_id 欄位');
      await Database.run(`ALTER TABLE orders ADD COLUMN coupon_id INTEGER`);
    }
    if (!hasCouponCode) {
      console.log('🧩 為 orders 表新增 coupon_code 欄位');
      await Database.run(`ALTER TABLE orders ADD COLUMN coupon_code TEXT`);
    }
    if (!hasDiscountAmount) {
      console.log('🧩 為 orders 表新增 discount_amount 欄位');
      await Database.run(`ALTER TABLE orders ADD COLUMN discount_amount INTEGER DEFAULT 0`);
    }

    console.log('🎉 優惠券相關資料表與欄位遷移完成！');
  } catch (error) {
    console.error('❌ 優惠券遷移失敗:', error);
    throw error;
  }
}

// 允許直接執行
if (require.main === module) {
  migrateAddCoupons()
    .then(() => {
      console.log('✅ 遷移腳本執行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 遷移腳本執行失敗:', error);
      process.exit(1);
    });
}

module.exports = migrateAddCoupons;


