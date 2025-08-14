const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// PostgreSQL 數據庫初始化腳本
async function initializePostgreSQL() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL 環境變數未設置');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: connectionString,
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false
    } : false
  });

  try {
    console.log('🚀 開始初始化 PostgreSQL 數據庫...');

    // 創建表格的 SQL（從 SQLite 轉換為 PostgreSQL）
    const createTables = `
      -- 管理員表（同時支援舊的 admin_users 和新的 admins 表名）
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        email VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      -- 如果 admins 表不存在，創建它作為 admin_users 的別名視圖
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'admins') THEN
          CREATE VIEW admins AS SELECT * FROM admin_users;
        END IF;
      END $$;

      -- 商品分類表
      CREATE TABLE IF NOT EXISTS product_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- 商品表
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        category VARCHAR(100) DEFAULT '其他產品',
        multi_discount TEXT DEFAULT '{}',
        images TEXT DEFAULT '[]',
        is_active BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- 規格分類表
      CREATE TABLE IF NOT EXISTS flavor_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- 規格表
      CREATE TABLE IF NOT EXISTS flavors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        product_id INTEGER REFERENCES products(id),
        category_id INTEGER DEFAULT 1 REFERENCES flavor_categories(id),
        stock INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        price DECIMAL(10,2),
        image VARCHAR(500),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- 商品規格關聯表
      CREATE TABLE IF NOT EXISTS product_flavors (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        flavor_id INTEGER REFERENCES flavors(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(product_id, flavor_id)
      );

      -- 加購商品表
      CREATE TABLE IF NOT EXISTS upsell_products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        stock INTEGER DEFAULT 0,
        images TEXT DEFAULT '[]',
        is_active BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- 優惠券表
      CREATE TABLE IF NOT EXISTS coupons (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        type VARCHAR(20) NOT NULL CHECK (type IN ('percentage', 'fixed_amount', 'free_shipping')),
        value DECIMAL(10,2) NOT NULL,
        min_order_amount DECIMAL(10,2) DEFAULT 0,
        max_discount DECIMAL(10,2),
        usage_limit INTEGER,
        per_user_limit INTEGER DEFAULT 1,
        used_count INTEGER DEFAULT 0,
        valid_from TIMESTAMP,
        valid_until TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- 優惠券使用記錄表
      CREATE TABLE IF NOT EXISTS coupon_usages (
        id SERIAL PRIMARY KEY,
        coupon_id INTEGER REFERENCES coupons(id) ON DELETE CASCADE,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        customer_phone VARCHAR(20) NOT NULL,
        discount_amount DECIMAL(10,2) NOT NULL,
        used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- 訂單表
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        order_number VARCHAR(50) UNIQUE NOT NULL,
        customer_name VARCHAR(100) NOT NULL,
        customer_phone VARCHAR(20) NOT NULL,
        store_number VARCHAR(50) NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        shipping_fee DECIMAL(10,2) DEFAULT 0,
        discount_amount DECIMAL(10,2) DEFAULT 0,
        coupon_code VARCHAR(50),
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
        verification_code VARCHAR(10),
        tracking_number VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- 訂單商品表
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        product_name VARCHAR(200) NOT NULL,
        product_price DECIMAL(10,2) NOT NULL,
        quantity INTEGER NOT NULL,
        flavors TEXT,
        subtotal DECIMAL(10,2) NOT NULL,
        is_upsell BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- 公告表
      CREATE TABLE IF NOT EXISTS announcements (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        type VARCHAR(20) DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error')),
        is_active BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- 設置表（使用 site_settings 以符合現有代碼）
      CREATE TABLE IF NOT EXISTS site_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT,
        setting_type VARCHAR(20) DEFAULT 'text',
        description TEXT,
        category VARCHAR(50) DEFAULT 'general',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      -- 同時創建 settings 表作為別名視圖（向後兼容）
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'settings') THEN
          CREATE VIEW settings AS SELECT 
            id, 
            setting_key as key, 
            setting_value as value, 
            description,
            created_at,
            updated_at
          FROM site_settings;
        END IF;
      END $$;

      -- 創建索引（只在實際表上創建，不在視圖上創建）
      CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
      CREATE INDEX IF NOT EXISTS idx_flavors_category ON flavors(category_id);
      CREATE INDEX IF NOT EXISTS idx_flavors_active ON flavors(is_active);
      CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
      CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
      CREATE INDEX IF NOT EXISTS idx_site_settings_key ON site_settings(setting_key);
    `;

    // 執行創建表格
    await pool.query(createTables);
    console.log('✅ 數據庫表格創建成功');

    // 插入默認管理員賬戶（如果不存在）
    const bcrypt = require('bcrypt');
    const adminPassword = await bcrypt.hash('admin123', 10);
    
    await pool.query(`
      INSERT INTO admin_users (username, password_hash, email, is_active)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (username) DO NOTHING
    `, ['admin', adminPassword, 'admin@meelful.com', true]);
    
    console.log('✅ 默認管理員賬戶已創建/檢查');

    // 插入預設 flavor_categories（必需的基礎數據）
    await pool.query(`
      INSERT INTO flavor_categories (id, name, description, sort_order, is_active)
      VALUES (1, '其他系列', '其他特殊口味', 1, true)
      ON CONFLICT (id) DO NOTHING
    `);

    // 插入一些基本設置
    const defaultSettings = [
      ['site_title', 'MeelFul', 'text', '網站標題', 'general'],
      ['site_description', 'MeelFul - 優質產品專賣店，為您提供最佳的購物體驗', 'text', '網站描述', 'general'],
      ['homepage_subtitle', '精選優質產品，為您帶來最美好的體驗', 'text', '首頁副標題', 'homepage'],
      ['free_shipping_threshold', '3000', 'number', '免運門檻', 'shipping'],
      ['shipping_fee', '60', 'number', '運費金額', 'shipping'],
      ['contact_phone', '', 'text', '聯絡電話', 'contact'],
      ['contact_email', '', 'text', '聯絡信箱', 'contact'],
      ['contact_line', 'https://line.me/ti/p/@590shgcm', 'text', 'LINE 官方帳號', 'contact'],
      ['contact_telegram', 'https://t.me/whalesale', 'text', 'Telegram 聯絡方式', 'contact'],
      ['homepage_hero_enabled', 'true', 'boolean', '啟用 Hero 區域標題', 'homepage'],
      ['homepage_title', 'MeelFul', 'text', 'Hero 區域主標題', 'homepage'],
      ['popup_enabled', 'false', 'boolean', '啟用首頁彈窗', 'popup'],
      ['order_complete_popup_enabled', 'true', 'boolean', '啟用訂單完成彈窗', 'popup']
    ];

    for (const [key, value, type, description, category] of defaultSettings) {
      await pool.query(`
        INSERT INTO site_settings (setting_key, setting_value, setting_type, description, category, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (setting_key) DO NOTHING
      `, [key, value, type, description, category, true]);
    }

    // 插入範例產品和分類
    await pool.query(`
      INSERT INTO product_categories (name, description, sort_order, is_active)
      VALUES ('茶葉系列', '精選茶葉產品', 1, true), 
             ('咖啡系列', '優質咖啡豆', 2, true),
             ('點心系列', '手工製作點心', 3, true)
      ON CONFLICT DO NOTHING
    `);

    // 插入範例產品
    const sampleProducts = [
      ['精選茶葉禮盒', 'Premium tea collection', 299.00, '茶葉系列', '{"2": 0.9, "3": 0.8}', '["product1_1.jpg", "product1_2.jpg"]'],
      ['經典咖啡豆', 'Classic coffee beans', 199.00, '咖啡系列', '{"2": 0.95}', '["product2_1.jpg"]'],
      ['手工餅乾組合', 'Handmade cookies set', 149.00, '點心系列', '{"3": 0.85, "5": 0.75}', '["product3_1.jpg", "product3_2.jpg", "product3_3.jpg"]']
    ];

    for (const [name, description, price, category, multiDiscount, images] of sampleProducts) {
      const result = await pool.query(`
        INSERT INTO products (name, description, price, category, multi_discount, images, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, true)
        ON CONFLICT DO NOTHING
        RETURNING id
      `, [name, description, price, category, multiDiscount, images]);

      if (result.rows.length > 0) {
        const productId = result.rows[0].id;
        // 為每個產品添加一些基本規格
        await pool.query(`
          INSERT INTO flavors (name, product_id, category_id, stock, sort_order, is_active)
          VALUES ($1, $2, 1, 100, 1, true)
          ON CONFLICT DO NOTHING
        `, [`${name} - 經典款`, productId]);
      }
    }

    // 插入範例公告
    await pool.query(`
      INSERT INTO announcements (title, content, type, is_active, sort_order)
      VALUES 
        ('歡迎來到 MeelFul', '我們提供最優質的產品，感謝您的支持！', 'info', true, 10),
        ('新品上架通知', '精選茶葉禮盒現已上架，限時優惠中！', 'success', true, 5)
      ON CONFLICT DO NOTHING
    `);

    console.log('✅ 默認設置已插入');
    console.log('🎉 PostgreSQL 數據庫初始化完成！');

  } catch (error) {
    console.error('❌ 數據庫初始化失敗:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// 如果直接運行此腳本
if (require.main === module) {
  initializePostgreSQL()
    .then(() => {
      console.log('✅ 遷移完成');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ 遷移失敗:', error);
      process.exit(1);
    });
}

module.exports = { initializePostgreSQL };