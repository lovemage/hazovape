-- 修復 orders 表缺少的優惠券相關欄位
-- 解決 "column coupon_id of relation orders does not exist" 錯誤

-- 檢查並添加 coupon_id 欄位
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'coupon_id'
    ) THEN
        ALTER TABLE orders ADD COLUMN coupon_id INTEGER;
        RAISE NOTICE '✅ 已添加 coupon_id 欄位';
    ELSE
        RAISE NOTICE '✅ coupon_id 欄位已存在';
    END IF;
END $$;

-- 檢查並添加 coupon_code 欄位
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'coupon_code'
    ) THEN
        ALTER TABLE orders ADD COLUMN coupon_code VARCHAR(50);
        RAISE NOTICE '✅ 已添加 coupon_code 欄位';
    ELSE
        RAISE NOTICE '✅ coupon_code 欄位已存在';
    END IF;
END $$;

-- 檢查並添加 discount_amount 欄位
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'discount_amount'
    ) THEN
        ALTER TABLE orders ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0;
        RAISE NOTICE '✅ 已添加 discount_amount 欄位';
    ELSE
        RAISE NOTICE '✅ discount_amount 欄位已存在';
    END IF;
END $$;

-- 驗證修復結果
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN ('coupon_id', 'coupon_code', 'discount_amount')
ORDER BY column_name;
