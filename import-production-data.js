#!/usr/bin/env node

const fs = require('fs').promises;
require('dotenv').config({ path: './backend/.env' });
const Database = require('./backend/config/database');

async function importProductionData() {
  try {
    console.log('🚀 開始匯入生產資料...');

    // 讀取產品數據
    console.log('📦 讀取產品數據...');
    const productsData = await fs.readFile('./backend/production-products-2025-08-10.json', 'utf8');
    const products = JSON.parse(productsData);

    if (products.success && products.data) {
      console.log(`發現 ${products.data.length} 個產品`);

      // 添加 disable_coupon 欄位（如果不存在）
      for (const product of products.data) {
        try {
          // 清理並插入產品數據
          const productData = {
            id: product.id,
            name: product.name,
            description: product.description || '',
            price: product.price,
            category: product.category || '其他',
            multi_discount: JSON.stringify(product.multi_discount || {}),
            images: JSON.stringify(product.images || []),
            is_active: product.is_active !== false,
            disable_coupon: product.disable_coupon || false,
            sort_order: product.sort_order || 0
          };

          // 使用 PostgreSQL INSERT ON CONFLICT (不包含 disable_coupon)
          const sql = `
            INSERT INTO products (id, name, description, price, category, multi_discount, images, is_active, sort_order)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (id)
            DO UPDATE SET
              name = EXCLUDED.name,
              description = EXCLUDED.description,
              price = EXCLUDED.price,
              category = EXCLUDED.category,
              multi_discount = EXCLUDED.multi_discount,
              images = EXCLUDED.images,
              is_active = EXCLUDED.is_active,
              sort_order = EXCLUDED.sort_order,
              updated_at = CURRENT_TIMESTAMP
          `;

          await Database.run(sql, [
            productData.id,
            productData.name,
            productData.description,
            productData.price,
            productData.category,
            productData.multi_discount,
            productData.images,
            productData.is_active,
            productData.sort_order
          ]);

          // 匯入產品規格（如果有）
          if (product.variants && product.variants.length > 0) {
            for (const variant of product.variants) {
              const variantData = {
                id: variant.id,
                name: variant.name,
                product_id: product.id,
                category_id: variant.category_id || 1,
                stock: variant.stock || 0,
                sort_order: variant.sort_order || 0,
                price: variant.price || null,
                image: variant.image || null,
                is_active: variant.is_active !== false
              };

              const variantSql = `
                INSERT INTO flavors (id, name, product_id, category_id, stock, sort_order, price, image, is_active)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT (id)
                DO UPDATE SET
                  name = EXCLUDED.name,
                  product_id = EXCLUDED.product_id,
                  category_id = EXCLUDED.category_id,
                  stock = EXCLUDED.stock,
                  sort_order = EXCLUDED.sort_order,
                  price = EXCLUDED.price,
                  image = EXCLUDED.image,
                  is_active = EXCLUDED.is_active,
                  updated_at = CURRENT_TIMESTAMP
              `;

              await Database.run(variantSql, [
                variantData.id,
                variantData.name,
                variantData.product_id,
                variantData.category_id,
                variantData.stock,
                variantData.sort_order,
                variantData.price,
                variantData.image,
                variantData.is_active
              ]);
            }
          }

          console.log(`✅ 產品 "${product.name}" 匯入成功`);
        } catch (error) {
          console.log(`❌ 產品 "${product.name}" 匯入失敗:`, error.message);
        }
      }
    }

    // 讀取設定數據
    console.log('⚙️ 讀取設定數據...');
    try {
      const settingsData = await fs.readFile('./backend/production-settings-2025-08-10.json', 'utf8');
      const settings = JSON.parse(settingsData);

      if (settings.success && settings.data) {
        console.log(`發現 ${Object.keys(settings.data).length} 個設定`);

        for (const [key, value] of Object.entries(settings.data)) {
          try {
            const settingData = {
              setting_key: key,
              setting_value: String(value),
              data_type: typeof value === 'boolean' ? 'boolean' : 'string',
              description: `生產環境設定`,
              category: 'production',
              is_active: true
            };

            const settingSql = `
              INSERT INTO site_settings (setting_key, setting_value, data_type, description, category, is_active)
              VALUES ($1, $2, $3, $4, $5, $6)
              ON CONFLICT (setting_key)
              DO UPDATE SET
                setting_value = EXCLUDED.setting_value,
                data_type = EXCLUDED.data_type,
                description = EXCLUDED.description,
                category = EXCLUDED.category,
                is_active = EXCLUDED.is_active,
                updated_at = CURRENT_TIMESTAMP
            `;

            await Database.run(settingSql, [
              settingData.setting_key,
              settingData.setting_value,
              settingData.data_type,
              settingData.description,
              settingData.category,
              settingData.is_active
            ]);
            console.log(`✅ 設定 "${key}" 匯入成功`);
          } catch (error) {
            console.log(`❌ 設定 "${key}" 匯入失敗:`, error.message);
          }
        }
      }
    } catch (error) {
      console.log('⚠️ 設定文件讀取失敗，跳過設定匯入:', error.message);
    }

    console.log('🎉 生產資料匯入完成！');
    process.exit(0);

  } catch (error) {
    console.error('❌ 匯入失敗:', error);
    process.exit(1);
  }
}

// 執行匯入
importProductionData();