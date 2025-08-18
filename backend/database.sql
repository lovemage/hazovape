-- Mist Mall 數據庫結構設計

-- 商品表（移除庫存，庫存由口味管理）
CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,              -- 商品名稱
    price DECIMAL(10,2) NOT NULL,    -- 價格
    multi_discount TEXT DEFAULT '{}',-- 多件優惠規則（JSON格式）
    images TEXT DEFAULT '[]',        -- 圖片路徑（JSON數組，最多5張）
    is_active BOOLEAN DEFAULT 1,     -- 是否啟用
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 口味類別表
CREATE TABLE flavor_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,       -- 類別名稱
    description TEXT,                -- 類別描述
    sort_order INTEGER DEFAULT 0,    -- 排序順序
    is_active BOOLEAN DEFAULT 1,     -- 是否啟用
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 口味表（依附在商品下）
CREATE TABLE flavors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,              -- 口味名稱
    product_id INTEGER,              -- 所屬商品ID
    category_id INTEGER DEFAULT 1,   -- 口味類別ID
    stock INTEGER DEFAULT 0,         -- 庫存數量
    is_active BOOLEAN DEFAULT 1,     -- 是否啟用
    sort_order INTEGER DEFAULT 0,    -- 排序順序
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (category_id) REFERENCES flavor_categories(id)
);

-- 訂單表
CREATE TABLE orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT UNIQUE NOT NULL,     -- 訂單號 ORD{年}{日}{月}{時}{分}
    customer_name TEXT NOT NULL,           -- 客戶姓名
    customer_phone TEXT NOT NULL,          -- 客戶電話
    store_number TEXT NOT NULL,            -- 7-11店號
    total_amount DECIMAL(10,2) NOT NULL,   -- 總金額
    status TEXT DEFAULT 'pending',         -- 訂單狀態
    verification_code TEXT,                -- 驗證碼
    is_verified BOOLEAN DEFAULT 0,         -- 是否已驗證
    telegram_sent BOOLEAN DEFAULT 0,       -- 是否已發送Telegram通知
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 訂單項目表
CREATE TABLE order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    product_name TEXT NOT NULL,            -- 冗餘存儲，避免商品被刪除後找不到
    product_price DECIMAL(10,2) NOT NULL,  -- 下單時的價格
    quantity INTEGER NOT NULL,
    flavors TEXT,                          -- 選擇的口味（JSON數組）
    subtotal DECIMAL(10,2) NOT NULL,       -- 小計
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- 公告表
CREATE TABLE announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,                   -- 公告標題
    content TEXT NOT NULL,                 -- 公告內容
    is_active BOOLEAN DEFAULT 1,           -- 是否啟用
    priority INTEGER DEFAULT 0,            -- 優先級（數字越大越優先）
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 管理員表
CREATE TABLE admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,           -- 密碼哈希
    email TEXT,
    is_active BOOLEAN DEFAULT 1,
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 網站設置表
CREATE TABLE site_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT UNIQUE NOT NULL,      -- 設置鍵名
    setting_value TEXT,                    -- 設置值
    setting_type TEXT DEFAULT 'text',      -- 設置類型（text, number, boolean, json）
    description TEXT,                      -- 設置描述
    category TEXT DEFAULT 'general',       -- 設置分類
    is_active BOOLEAN DEFAULT 1,           -- 是否啟用
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 初始化數據

-- 插入預設管理員（密碼：admin123）
INSERT INTO admin_users (username, password_hash, email) VALUES 
('admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBdXVKvLHh.sMi', 'admin@mistmall.com');

-- 插入口味類別
-- INSERT INTO flavor_categories (id, name, description, sort_order) VALUES
-- (1, '其他系列', '其他特殊口味', 1);

-- 插入示例商品
INSERT INTO products (name, price, multi_discount, images) VALUES
('精選茶葉禮盒', 299.00, '{"2": 0.9, "3": 0.8}', '["product1_1.jpg", "product1_2.jpg"]'),
('經典咖啡豆', 199.00, '{"2": 0.95}', '["product2_1.jpg"]'),
('手工餅乾組合', 149.00, '{"3": 0.85, "5": 0.75}', '["product3_1.jpg", "product3_2.jpg", "product3_3.jpg"]');

-- 插入示例公告
INSERT INTO announcements (title, content, priority) VALUES
('歡迎來到 Mist Mall', '我們提供最優質的茶葉、咖啡和手工餅乾，感謝您的支持！', 10),
('新品上架通知', '精選茶葉禮盒現已上架，限時優惠中！', 5);

-- 插入網站設置
INSERT INTO site_settings (setting_key, setting_value, setting_type, description, category) VALUES
('homepage_subtitle', '精選優質茶葉、咖啡豆與手工餅乾，為您帶來最美好的味覺體驗', 'text', '首頁副標題', 'homepage'),
('site_title', 'Mist Mall', 'text', '網站標題', 'general'),
('site_description', '優質商品購物平台', 'text', '網站描述', 'general'),
('contact_phone', '', 'text', '聯絡電話', 'contact'),
('contact_email', '', 'text', '聯絡信箱', 'contact');
