const Database = require('../config/database');

async function createCouponTables() {
  try {
    console.log('🎫 開始創建優惠券表...');

    // 創建優惠券表
    await Database.run(`
      CREATE TABLE IF NOT EXISTS coupons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,              -- 優惠券代碼
        name TEXT NOT NULL,                     -- 優惠券名稱
        description TEXT,                       -- 優惠券描述
        type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed_amount', 'free_shipping')), -- 優惠券類型
        value DECIMAL(10,2) NOT NULL,           -- 優惠券值（百分比或固定金額）
        min_order_amount DECIMAL(10,2) DEFAULT 0, -- 最低訂單金額
        max_discount DECIMAL(10,2),             -- 最大折扣金額（僅百分比折扣）
        usage_limit INTEGER,                    -- 使用次數限制（NULL表示無限制）
        used_count INTEGER DEFAULT 0,           -- 已使用次數
        per_user_limit INTEGER DEFAULT 1,       -- 每用戶使用次數限制
        valid_from DATETIME NOT NULL,           -- 有效期開始
        valid_until DATETIME NOT NULL,          -- 有效期結束
        is_active BOOLEAN DEFAULT 1,            -- 是否啟用
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ 優惠券表創建成功');

    // 創建優惠券使用記錄表
    await Database.run(`
      CREATE TABLE IF NOT EXISTS coupon_usages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        coupon_id INTEGER NOT NULL,
        order_id INTEGER NOT NULL,
        customer_phone TEXT NOT NULL,           -- 使用者電話（用於識別用戶）
        discount_amount DECIMAL(10,2) NOT NULL, -- 實際折扣金額
        used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (coupon_id) REFERENCES coupons(id),
        FOREIGN KEY (order_id) REFERENCES orders(id)
      )
    `);
    console.log('✅ 優惠券使用記錄表創建成功');

    // 為orders表添加優惠券相關字段（如果不存在）
    try {
      await Database.run(`ALTER TABLE orders ADD COLUMN coupon_id INTEGER`);
      await Database.run(`ALTER TABLE orders ADD COLUMN coupon_code TEXT`);
      await Database.run(`ALTER TABLE orders ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0`);
      console.log('✅ 訂單表優惠券字段添加成功');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log('ℹ️ 訂單表優惠券字段已存在');
      } else {
        throw error;
      }
    }

    // 插入示例優惠券
    const sampleCoupons = [
      {
        code: 'WELCOME10',
        name: '新用戶歡迎券',
        description: '新用戶首次購物享受10%折扣',
        type: 'percentage',
        value: 10,
        min_order_amount: 500,
        max_discount: 200,
        usage_limit: null,
        per_user_limit: 1,
        valid_from: '2024-01-01 00:00:00',
        valid_until: '2025-12-31 23:59:59'
      },
      {
        code: 'SAVE50',
        name: '滿千折五十',
        description: '滿1000元立減50元',
        type: 'fixed_amount',
        value: 50,
        min_order_amount: 1000,
        max_discount: null,
        usage_limit: 1000,
        per_user_limit: 3,
        valid_from: '2024-01-01 00:00:00',
        valid_until: '2025-06-30 23:59:59'
      },
      {
        code: 'FREESHIP',
        name: '免運券',
        description: '任意金額免運費',
        type: 'free_shipping',
        value: 0,
        min_order_amount: 0,
        max_discount: null,
        usage_limit: 500,
        per_user_limit: 2,
        valid_from: '2024-01-01 00:00:00',
        valid_until: '2024-12-31 23:59:59'
      }
    ];

    for (const coupon of sampleCoupons) {
      try {
        await Database.run(`
          INSERT INTO coupons (
            code, name, description, type, value, min_order_amount, 
            max_discount, usage_limit, per_user_limit, valid_from, valid_until
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          coupon.code, coupon.name, coupon.description, coupon.type, coupon.value,
          coupon.min_order_amount, coupon.max_discount, coupon.usage_limit,
          coupon.per_user_limit, coupon.valid_from, coupon.valid_until
        ]);
        console.log(`✅ 示例優惠券 ${coupon.code} 創建成功`);
      } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
          console.log(`ℹ️ 優惠券 ${coupon.code} 已存在`);
        } else {
          throw error;
        }
      }
    }

    console.log('🎉 優惠券系統創建完成！');

  } catch (error) {
    console.error('❌ 創建優惠券表失敗:', error);
    throw error;
  }
}

// 如果直接執行此文件
if (require.main === module) {
  createCouponTables()
    .then(() => {
      console.log('✅ 優惠券表創建完成');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ 創建失敗:', error);
      process.exit(1);
    });
}

module.exports = { createCouponTables };
