#!/usr/bin/env node

/**
 * 修復 Heroku PostgreSQL orders 表缺少的優惠券相關欄位
 * 解決 "column coupon_id of relation orders does not exist" 錯誤
 */

const { Pool } = require('pg');

async function fixHerokuOrdersTable() {
  console.log('🚀 開始修復 Heroku PostgreSQL orders 表...');
  
  let pool;
  
  try {
    // 連接到 PostgreSQL
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
      } : false
    });

    // 測試連接
    await pool.query('SELECT NOW()');
    console.log('✅ PostgreSQL 連接成功');

    // 檢查當前 orders 表結構
    console.log('🔍 檢查當前 orders 表結構...');
    const columnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
      ORDER BY ordinal_position
    `);

    console.log('當前 orders 表欄位:');
    columnsResult.rows.forEach(col => {
      console.log(`- ${col.column_name} (${col.data_type})`);
    });

    // 檢查缺少的欄位
    const hasCouponId = columnsResult.rows.some(col => col.column_name === 'coupon_id');
    const hasCouponCode = columnsResult.rows.some(col => col.column_name === 'coupon_code');
    const hasDiscountAmount = columnsResult.rows.some(col => col.column_name === 'discount_amount');

    console.log('\n📋 欄位檢查結果:');
    console.log(`coupon_id: ${hasCouponId ? '✅ 存在' : '❌ 缺少'}`);
    console.log(`coupon_code: ${hasCouponCode ? '✅ 存在' : '❌ 缺少'}`);
    console.log(`discount_amount: ${hasDiscountAmount ? '✅ 存在' : '❌ 缺少'}`);

    // 添加缺少的欄位
    if (!hasCouponId) {
      console.log('🔧 添加 coupon_id 欄位...');
      await pool.query('ALTER TABLE orders ADD COLUMN coupon_id INTEGER');
      console.log('✅ coupon_id 欄位添加成功');
    }

    if (!hasCouponCode) {
      console.log('🔧 添加 coupon_code 欄位...');
      await pool.query('ALTER TABLE orders ADD COLUMN coupon_code VARCHAR(50)');
      console.log('✅ coupon_code 欄位添加成功');
    }

    if (!hasDiscountAmount) {
      console.log('🔧 添加 discount_amount 欄位...');
      await pool.query('ALTER TABLE orders ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0');
      console.log('✅ discount_amount 欄位添加成功');
    }

    if (hasCouponId && hasCouponCode && hasDiscountAmount) {
      console.log('✅ 所有優惠券相關欄位都已存在，無需修復');
    } else {
      console.log('🎉 orders 表修復完成！');
    }

    // 驗證修復結果
    console.log('\n🔍 驗證修復結果...');
    const verifyResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
      AND column_name IN ('coupon_id', 'coupon_code', 'discount_amount')
      ORDER BY column_name
    `);

    console.log('優惠券相關欄位:');
    verifyResult.rows.forEach(col => {
      console.log(`✅ ${col.column_name} (${col.data_type})`);
    });

  } catch (error) {
    console.error('❌ 修復失敗:', error.message);
    throw error;
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

// 允許直接執行
if (require.main === module) {
  fixHerokuOrdersTable()
    .then(() => {
      console.log('✅ 修復腳本執行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 修復腳本執行失敗:', error);
      process.exit(1);
    });
}

module.exports = fixHerokuOrdersTable;
