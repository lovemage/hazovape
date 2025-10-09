const express = require('express');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');
const Database = require('../config/database');
const { authenticateAdmin } = require('./auth');

const router = express.Router();

// 獲取Telegram配置 - 從 Railway 環境變數讀取
async function getTelegramConfig() {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    const enabled = process.env.TELEGRAM_ENABLED === 'true';

    console.log('📱 Telegram 配置檢查:');
    console.log('- Token:', token ? `已設置 (${token.substring(0, 10)}...)` : '❌ 未設置');
    console.log('- Chat ID:', chatId ? `已設置 (${chatId})` : '❌ 未設置');
    console.log('- 啟用狀態:', enabled ? '✅ 啟用' : '❌ 停用');
    console.log('- 最終狀態:', (enabled && token && chatId) ? '✅ 可用' : '❌ 不可用');

    if (!token) {
      console.log('💡 請設置 TELEGRAM_BOT_TOKEN 環境變數');
    }
    if (!chatId) {
      console.log('💡 請設置 TELEGRAM_CHAT_ID 環境變數');
    }
    if (!enabled) {
      console.log('💡 請設置 TELEGRAM_ENABLED=true 環境變數');
    }

    return {
      token: token || null,
      chatId: chatId || null,
      enabled: enabled && token && chatId
    };
  } catch (error) {
    console.error('❌ 獲取Telegram配置失敗:', error);
    return { token: null, chatId: null, enabled: false };
  }
}

// 生成唯一訂單號 ORD{年}{日}{月}{時}{分}{秒}{毫秒}
async function generateUniqueOrderNumber() {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    const millisecond = String(now.getMilliseconds()).padStart(3, '0');

    // 生成訂單號：ORD + 年 + 日 + 月 + 時 + 分 + 秒 + 毫秒前2位
    const orderNumber = `ORD${year}${day}${month}${hour}${minute}${second}${millisecond.substring(0, 2)}`;

    try {
      // 檢查訂單號是否已存在
      const existingOrder = await Database.get(
        'SELECT id FROM orders WHERE order_number = ?',
        [orderNumber]
      );

      if (!existingOrder) {
        console.log(`✅ 生成唯一訂單號: ${orderNumber} (嘗試次數: ${attempts + 1})`);
        return orderNumber;
      }

      console.log(`⚠️ 訂單號 ${orderNumber} 已存在，重新生成...`);
      attempts++;

      // 短暫延遲避免時間戳重複
      await new Promise(resolve => setTimeout(resolve, Math.random() * 10 + 1));

    } catch (error) {
      console.error('檢查訂單號唯一性時出錯:', error);
      attempts++;
    }
  }

  // 如果多次嘗試都失敗，添加隨機後綴
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');
  const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();

  const fallbackOrderNumber = `ORD${year}${day}${month}${hour}${minute}${second}${randomSuffix}`;
  console.log(`⚠️ 使用備用訂單號: ${fallbackOrderNumber}`);
  return fallbackOrderNumber;
}

// 生成驗證碼
function generateVerificationCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// 發送 Telegram 通知
async function sendTelegramNotification(order, orderItems) {
  try {
    const config = await getTelegramConfig();

    if (!config.enabled || !config.token || !config.chatId) {
      console.log('⚠️  Telegram Bot 未配置或未啟用，跳過通知');
      console.log('💡 請檢查環境變數：TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, TELEGRAM_ENABLED');
      return false;
    }

    const telegramBot = new TelegramBot(config.token, { polling: false });

    const itemsText = orderItems.map(item => {
      // 改為規格格式顯示
      let flavorsText = '';
      try {
        if (item.flavors) {
          const flavors = JSON.parse(item.flavors);
          if (Array.isArray(flavors) && flavors.length > 0) {
            flavorsText = `-${flavors.map((flavor, index) => `${flavor}${item.quantity}`).join(' ')}`;
          }
        }
      } catch (error) {
        flavorsText = '';
      }
      return `${item.product_name}${flavorsText} x${item.quantity} - ${Math.floor(item.subtotal)}元`;
    }).join('\n');

    // 準備優惠券信息
    let couponInfo = '';
    if (order.coupon_code && order.discount_amount && order.discount_amount > 0) {
      couponInfo = `\n🎫 優惠券: ${order.coupon_code} (折扣: ${Math.floor(order.discount_amount)}元)`;
    }

    // 計算原始金額（如果有折扣）
    let amountInfo = `💰 總金額: ${Math.floor(order.total_amount)}元`;
    if (order.discount_amount && order.discount_amount > 0) {
      const originalAmount = parseInt(order.total_amount) + parseInt(order.discount_amount);
      amountInfo = `💰 原價: ${Math.floor(originalAmount)}元\n💰 折扣後: ${Math.floor(order.total_amount)}元`;
    }

    const message = `
🛒 新訂單通知

📋 訂單號: ${order.order_number}
👤 客戶: ${order.customer_name}
📞 電話: ${order.customer_phone}
🏪 店號: ${order.store_number}
${amountInfo}${couponInfo}
🕐 下單時間: ${new Date(order.created_at).toLocaleDateString('zh-TW').replace(/\//g, '/') + ' ' + new Date(order.created_at).toLocaleTimeString('zh-TW', { hour12: false }).slice(0, 5)}

📦 訂購商品:
${itemsText}

🔑 驗證碼: ${order.verification_code}
    `.trim();

    await telegramBot.sendMessage(config.chatId, message);
    console.log('Telegram通知發送成功');
    return true;
  } catch (error) {
    console.error('❌ 發送 Telegram 通知失敗:');
    console.error('錯誤類型:', error.name);
    console.error('錯誤消息:', error.message);

    if (error.response) {
      console.error('API 響應:', error.response.body);
      if (error.response.body && error.response.body.error_code) {
        const errorCode = error.response.body.error_code;
        const description = error.response.body.description;
        console.error(`Telegram API 錯誤 ${errorCode}: ${description}`);

        if (errorCode === 400) {
          console.error('💡 可能的原因：Bot Token 或 Chat ID 無效');
        } else if (errorCode === 401) {
          console.error('💡 可能的原因：Bot Token 無效或已過期');
        } else if (errorCode === 403) {
          console.error('💡 可能的原因：Bot 被用戶阻擋或沒有發送消息權限');
        }
      }
    }

    console.error('💡 請檢查：');
    console.error('1. Bot Token 是否正確');
    console.error('2. Chat ID 是否正確');
    console.error('3. 是否已向 Bot 發送過消息');
    console.error('4. Bot 是否被阻擋');

    return false;
  }
}

// 創建訂單
router.post('/', async (req, res) => {
  try {
    console.log('🛒 收到訂單創建請求:', req.body);
    const { 
      customer_name, customer_phone, store_number, items, total_amount, 
      subtotal, shipping_fee, coupon_code, coupon_id, discount_amount 
    } = req.body;

    // 驗證必填字段
    if (!customer_name || !customer_phone || !store_number || !items || !Array.isArray(items) || items.length === 0) {
      console.log('❌ 訂單信息不完整，詳情:', {
        customer_name: !!customer_name,
        customer_phone: !!customer_phone,
        store_number: !!store_number,
        items: items ? `數組長度: ${items.length}` : '不存在',
        isArray: Array.isArray(items)
      });

      let errorMessage = '請填寫完整的訂單信息：';
      if (!customer_name) errorMessage += ' 缺少客戶姓名';
      if (!customer_phone) errorMessage += ' 缺少客戶電話';
      if (!store_number) errorMessage += ' 缺少店號';
      if (!items || !Array.isArray(items)) errorMessage += ' 缺少商品信息';
      if (Array.isArray(items) && items.length === 0) errorMessage += ' 購物車為空';

      return res.status(400).json({
        success: false,
        message: errorMessage
      });
    }

    console.log('✅ 訂單信息驗證通過，開始處理...');

    // 驗證商品庫存和計算總金額
    let totalAmount = 0;
    const validatedItems = [];
    
    // 檢查數據庫類型並正確處理事務
    const isPostgreSQL = !!process.env.DATABASE_URL;
    let client = null;
    let transactionStarted = false;

    try {
      if (isPostgreSQL) {
        // PostgreSQL 事務處理
        client = await Database.beginTransaction();
      } else {
        // SQLite 事務處理
        await Database.beginTransaction();
      }
      transactionStarted = true;
      for (const [index, item] of items.entries()) {
        console.log(`🔍 驗證商品 ${index + 1}:`, item);
        const { product_id, upsell_product_id, quantity, flavors, is_upsell = false } = item;

        if (!quantity || quantity <= 0) {
          throw new Error(`商品 ${index + 1} 數量錯誤：quantity=${quantity}`);
        }

        let product = null;
        let processedFlavors = flavors || [];

        if (is_upsell && upsell_product_id) {
          // 處理加購商品
          console.log(`🛒 處理加購商品 ID: ${upsell_product_id}`);

          product = await Database.get(
            'SELECT * FROM upsell_products WHERE id = ? AND is_active = true',
            [upsell_product_id]
          );

          if (!product) {
            throw new Error(`加購商品 ID ${upsell_product_id} 不存在或已下架`);
          }

          // 檢查加購商品庫存
          if (product.stock < quantity) {
            throw new Error(`加購商品 "${product.name}" 庫存不足，現有庫存: ${product.stock} 件`);
          }

          // 加購商品沒有規格
          processedFlavors = [];
        } else if (!is_upsell && product_id) {
          // 處理一般商品
          console.log(`📦 處理一般商品 ID: ${product_id}`);

          if (!processedFlavors || !Array.isArray(processedFlavors)) {
            throw new Error('規格格式錯誤');
          }

          // 如果沒有選擇規格，使用默認規格
          if (processedFlavors.length === 0) {
            processedFlavors = ['原味'];
          }

          product = await Database.get(
            'SELECT * FROM products WHERE id = ? AND is_active = true',
            [product_id]
          );

          if (!product) {
            throw new Error(`商品 ID ${product_id} 不存在或已下架`);
          }
        } else {
          throw new Error(`商品 ${index + 1} 數據格式錯誤`);
        }

        // 只對一般商品檢查規格庫存
        if (!is_upsell && processedFlavors.length > 0) {
          console.log(`🔍 檢查商品 ${product_id} 的規格:`, processedFlavors);

          for (const flavorName of processedFlavors) {
            console.log(`🔍 查找規格: "${flavorName}" (產品ID: ${product_id})`);

            // 使用行鎖檢查庫存，防止併發問題
            const flavor = await Database.get(
              'SELECT * FROM flavors WHERE name = ? AND product_id = ? AND is_active = true',
              [flavorName, product_id]
            );

            console.log(`📋 規格查詢結果:`, flavor);

            if (!flavor) {
              // 查看所有可用的規格
              const allFlavors = await Database.all(
                'SELECT id, name, product_id, is_active FROM flavors WHERE product_id = ?',
                [product_id]
              );
              console.log(`📋 商品 ${product_id} 的所有規格:`, allFlavors);

              throw new Error(`規格 "${flavorName}" 不存在或已下架。可用規格: ${allFlavors.filter(f => f.is_active).map(f => f.name).join(', ')}`);
            }

            // 在事務中再次檢查庫存，確保數據一致性 (每個規格名稱只需要1件)
            if (flavor.stock < 1) {
              console.error(`❌ 庫存不足: 規格"${flavorName}" 需要1件，現有${flavor.stock}件`);
              throw new Error(`規格 "${flavorName}" 庫存不足，現有庫存: ${flavor.stock} 件，需要: 1 件`);
            }

            console.log(`✅ 庫存檢查通過: 規格"${flavorName}" 現有${flavor.stock}件，需要1件`);
          }
        }

        // 計算價格 - 改為以規格為計價單位
        let subtotal = 0;
        let unitPrice = product.price;

        if (!is_upsell && processedFlavors.length > 0) {
          // 一般商品：每個規格單獨計價（現在前端已拆分為單個規格）
          console.log(`💰 規格計價: 商品 ${product.name}, 規格: ${processedFlavors[0]}, 數量: ${quantity}`);
          
          const flavorName = processedFlavors[0]; // 現在每個訂單項目只有一個規格
          
          // 獲取規格資訊，檢查是否有獨立價格
          const flavor = await Database.get(
            'SELECT price FROM flavors WHERE name = ? AND product_id = ? AND is_active = true',
            [flavorName, product_id]
          );
          
          // 使用規格價格（如果有），否則使用產品價格
          const flavorPrice = flavor?.price || product.price;
          subtotal = Math.round(flavorPrice * quantity);
          unitPrice = flavorPrice;
          
          console.log(`💰 規格 "${flavorName}": 價格=${flavorPrice}, 數量=${quantity}, 小計=${subtotal}`);
        } else {
          // 加購商品或無規格商品：使用原有邏輯
          subtotal = Math.round(product.price * quantity);
          unitPrice = product.price;
          
          console.log(`💰 商品計價: 單價=${unitPrice}, 數量=${quantity}, 小計=${subtotal}`);
        }

        totalAmount += subtotal;

        // 扣減庫存
        if (is_upsell) {
          // 扣減加購商品庫存
          await Database.run(
            'UPDATE upsell_products SET stock = stock - ? WHERE id = ?',
            [quantity, upsell_product_id]
          );
        } else {
          // 扣減一般商品的規格庫存
          for (const flavorName of processedFlavors) {
            console.log(`📦 準備扣減庫存: 產品${product_id} "${flavorName}" -${quantity}`);

            // 先檢查規格是否存在
            const flavorCheck = await Database.get(
              'SELECT id, name, stock FROM flavors WHERE name = ? AND product_id = ?',
              [flavorName, product_id]
            );

            if (!flavorCheck) {
              console.error(`❌ 規格不存在: 產品${product_id} "${flavorName}"`);
              throw new Error(`規格 "${flavorName}" 在產品 ${product_id} 中不存在`);
            }

            console.log(`✅ 找到規格: ID=${flavorCheck.id}, 當前庫存=${flavorCheck.stock}`);

            // 執行庫存扣減，防止負庫存 (每個規格名稱扣減1件)
            const updateResult = await Database.run(
              'UPDATE flavors SET stock = stock - ? WHERE name = ? AND product_id = ? AND stock >= ?',
              [1, flavorName, product_id, 1]
            );

            console.log(`📦 庫存扣減結果: 影響行數=${updateResult.changes}`);

            if (updateResult.changes === 0) {
              // 重新檢查當前庫存
              const currentStock = await Database.get(
                'SELECT stock FROM flavors WHERE name = ? AND product_id = ?',
                [flavorName, product_id]
              );

              console.error(`❌ 庫存扣減失敗: 產品${product_id} "${flavorName}", 當前庫存: ${currentStock?.stock || 0}, 需要: 1`);
              throw new Error(`規格 "${flavorName}" 庫存不足，現有庫存: ${currentStock?.stock || 0} 件，需要: 1 件`);
            }

            // 檢查扣減後是否出現負庫存
            const afterStock = await Database.get(
              'SELECT stock FROM flavors WHERE name = ? AND product_id = ?',
              [flavorName, product_id]
            );

            if (afterStock && afterStock.stock < 0) {
              console.error(`🚨 檢測到負庫存: 產品${product_id} "${flavorName}" 庫存=${afterStock.stock}`);
              // 回滾這次扣減
              await Database.run(
                'UPDATE flavors SET stock = stock + ? WHERE name = ? AND product_id = ?',
                [1, flavorName, product_id]
              );
              throw new Error(`規格 "${flavorName}" 庫存不足，請重新整理頁面後再試`);
            }

            console.log(`✅ 庫存扣減成功: 產品${product_id} "${flavorName}" 剩餘庫存=${afterStock?.stock || 0}`);
          }
        }

        validatedItems.push({
          product_id: is_upsell ? null : product_id,
          upsell_product_id: is_upsell ? upsell_product_id : null,
          product_name: product.name,
          product_price: Math.round(unitPrice),
          quantity,
          flavors: processedFlavors.length > 0 ? JSON.stringify(processedFlavors) : null,
          subtotal: Math.round(subtotal),
          is_upsell: is_upsell ? 1 : 0
        });
      }

      // 生成唯一訂單號和驗證碼
      const orderNumber = await generateUniqueOrderNumber();
      const verificationCode = generateVerificationCode();

      // 使用前端傳來的 total_amount（包含運費）
      const finalTotalAmount = total_amount || Math.round(totalAmount);

      console.log('💰 訂單金額確認:', {
        商品總額: Math.round(totalAmount),
        前端傳來的總額: total_amount,
        最終存儲金額: finalTotalAmount
      });

      // 創建訂單
      const orderResult = await Database.run(
        `INSERT INTO orders (order_number, customer_name, customer_phone, store_number, total_amount, verification_code, coupon_id, coupon_code, discount_amount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
        [orderNumber, customer_name, customer_phone, store_number, finalTotalAmount, verificationCode, coupon_id || null, coupon_code || null, discount_amount || 0]
      );

      // 創建訂單項目
      for (const item of validatedItems) {
        await Database.run(
          `INSERT INTO order_items (order_id, product_id, upsell_product_id, product_name, product_price, quantity, flavors, subtotal, is_upsell)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [orderResult.id, item.product_id, item.upsell_product_id, item.product_name, item.product_price, item.quantity, item.flavors, item.subtotal, item.is_upsell]
        );
      }

      // 如果使用了優惠券，記錄使用情況
      if (coupon_id && discount_amount > 0) {
        console.log('🎫 記錄優惠券使用:', { coupon_id, discount_amount, customer_phone });
        
        await Database.run(
          `INSERT INTO coupon_usages (coupon_id, order_id, customer_phone, discount_amount)
           VALUES (?, ?, ?, ?)`,
          [coupon_id, orderResult.id, customer_phone, discount_amount]
        );

        // 更新優惠券使用次數
        await Database.run(
          `UPDATE coupons SET used_count = used_count + 1 WHERE id = ?`,
          [coupon_id]
        );

        console.log('✅ 優惠券使用記錄完成');
      }

      if (isPostgreSQL) {
        await Database.commit(client);
      } else {
        await Database.commit();
      }

      // 獲取完整訂單信息
      const order = await Database.get('SELECT * FROM orders WHERE id = ?', [orderResult.id]);
      const orderItems = await Database.all('SELECT * FROM order_items WHERE order_id = ?', [orderResult.id]);

      // 發送 Telegram 通知（不影響訂單創建）
      try {
        const telegramSent = await sendTelegramNotification(order, orderItems);
        if (telegramSent) {
          await Database.run('UPDATE orders SET telegram_sent = true WHERE id = ?', [orderResult.id]);
          console.log('✅ Telegram通知發送成功並已標記');
        } else {
          console.log('⚠️  Telegram通知發送失敗，但訂單創建成功');
        }
      } catch (telegramError) {
        console.error('⚠️  Telegram通知發送異常:', telegramError.message);
        console.log('✅ 訂單仍正常創建，Telegram通知可稍後重發');
      }

      res.json({
        success: true,
        message: '訂單創建成功',
        data: {
          id: orderResult.id,
          order_id: orderResult.id,
          order_number: orderNumber,
          verification_code: verificationCode,
          total_amount: finalTotalAmount,
          customer_name: customer_name,
          customer_phone: customer_phone,
          store_number: store_number,
          status: 'pending',
          created_at: new Date().toISOString(),
          items: validatedItems
        }
      });

    } catch (error) {
      if (transactionStarted) {
        try {
          if (isPostgreSQL && client) {
            await Database.rollback(client);
          } else if (!isPostgreSQL) {
            await Database.rollback();
          }
        } catch (rollbackError) {
          console.warn('回滾事務失敗:', rollbackError.message);
        }
      }
      throw error;
    }

  } catch (error) {
    console.error('創建訂單錯誤:', error);
    res.status(400).json({
      success: false,
      message: error.message || '創建訂單失敗'
    });
  }
});

// 驗證訂單
router.post('/verify', async (req, res) => {
  try {
    const { order_number, verification_code } = req.body;

    if (!order_number || !verification_code) {
      return res.status(400).json({
        success: false,
        message: '請提供訂單號和驗證碼'
      });
    }

    const order = await Database.get(
      'SELECT * FROM orders WHERE order_number = ? AND verification_code = ?',
      [order_number, verification_code]
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: '訂單號或驗證碼錯誤'
      });
    }

    // 更新驗證狀態
    await Database.run(
      'UPDATE orders SET is_verified = true WHERE id = ?',
      [order.id]
    );

    res.json({
      success: true,
      message: '訂單驗證成功',
      data: {
        order_number: order.order_number,
        customer_name: order.customer_name,
        total_amount: order.total_amount
      }
    });

  } catch (error) {
    console.error('驗證訂單錯誤:', error);
    res.status(500).json({
      success: false,
      message: '驗證訂單失敗'
    });
  }
});

// 查詢訂單詳情
router.post('/query', async (req, res) => {
  const startTime = Date.now();
  console.log('🔍 收到訂單查詢請求:', req.body);

  try {
    const { order_number, verification_code } = req.body;

    if (!order_number || !verification_code) {
      console.log('❌ 缺少必要參數');
      return res.status(400).json({
        success: false,
        message: '請提供訂單號和驗證碼'
      });
    }

    console.log('🔍 查詢參數:', { order_number, verification_code });

    // 查詢訂單基本信息
    console.log('⏱️  開始查詢訂單...');
    const queryStart = Date.now();

    const order = await Database.get(
      'SELECT * FROM orders WHERE order_number = ? AND verification_code = ?',
      [order_number, verification_code]
    );

    console.log(`⏱️  訂單查詢耗時: ${Date.now() - queryStart}ms`);

    if (!order) {
      console.log('❌ 訂單未找到');
      return res.status(404).json({
        success: false,
        message: '訂單號或驗證碼錯誤'
      });
    }

    console.log('✅ 找到訂單:', order.order_number);

    // 查詢訂單項目
    console.log('⏱️  開始查詢訂單項目...');
    const itemsStart = Date.now();

    const orderItems = await Database.all(
      'SELECT * FROM order_items WHERE order_id = ?',
      [order.id]
    );

    console.log(`⏱️  訂單項目查詢耗時: ${Date.now() - itemsStart}ms`);

    // 格式化訂單項目數據
    const formattedItems = orderItems.map(item => ({
      id: item.id,
      product_name: item.product_name,
      product_price: item.product_price,
      quantity: item.quantity,
      flavors: item.flavors ? JSON.parse(item.flavors) : [],
      subtotal: item.subtotal,
      is_upsell: item.is_upsell === true
    }));

    // 格式化訂單狀態
    const getStatusText = (status) => {
      switch (status) {
        case 'pending': return '待處理';
        case 'confirmed': return '已確認';
        case 'shipped': return '已出貨';
        case 'delivered': return '已送達';
        case 'cancelled': return '已取消';
        default: return '未知狀態';
      }
    };

    const responseData = {
      order_number: order.order_number,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      store_number: order.store_number,
      total_amount: order.total_amount,
      status: order.status,
      status_text: getStatusText(order.status),
      is_verified: order.is_verified === true,
      tracking_number: order.tracking_number,
      created_at: order.created_at,
      items: formattedItems
    };

    const totalTime = Date.now() - startTime;
    console.log(`✅ 訂單查詢完成，總耗時: ${totalTime}ms`);

    res.json({
      success: true,
      message: '查詢成功',
      data: responseData
    });

  } catch (error) {
    console.error('❌ 查詢訂單錯誤:', error);
    res.status(500).json({
      success: false,
      message: '查詢訂單失敗'
    });
  }
});

// 管理員：獲取所有訂單
router.get('/admin/all', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    let params = [];

    if (status && status !== 'all') {
      whereClause += ' WHERE status = ?';
      params.push(status);
    }

    if (search) {
      whereClause += whereClause ? ' AND' : ' WHERE';
      whereClause += ' (order_number LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // 獲取訂單列表
    const orders = await Database.all(
      `SELECT * FROM orders ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    // 獲取總數
    const countResult = await Database.get(
      `SELECT COUNT(*) as total FROM orders ${whereClause}`,
      params
    );

    // 為每個訂單獲取訂單項目
    for (const order of orders) {
      const items = await Database.all(
        'SELECT * FROM order_items WHERE order_id = ?',
        [order.id]
      );
      order.items = items.map(item => ({
        ...item,
        flavors: item.flavors ? JSON.parse(item.flavors) : []
      }));
    }

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total: countResult.total,
          total_pages: Math.ceil(countResult.total / limit)
        }
      }
    });

  } catch (error) {
    console.error('獲取訂單列表錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取訂單列表失敗'
    });
  }
});

// 管理員：更新運輸單號
router.put('/admin/:id/tracking', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { tracking_number } = req.body;

    // 驗證輸入
    if (!tracking_number || typeof tracking_number !== 'string' || tracking_number.trim() === '') {
      return res.status(400).json({
        success: false,
        message: '請提供有效的運輸單號'
      });
    }

    // 檢查訂單是否存在
    const order = await Database.get('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: '訂單不存在'
      });
    }

    // 更新運輸單號
    const result = await Database.run(
      'UPDATE orders SET tracking_number = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [tracking_number.trim(), id]
    );

    if (result.changes === 0) {
      return res.status(500).json({
        success: false,
        message: '更新運輸單號失敗'
      });
    }

    console.log(`✅ 訂單 ${order.order_number} 的運輸單號已更新為: ${tracking_number.trim()}`);

    res.json({
      success: true,
      message: '運輸單號更新成功',
      data: {
        order_id: id,
        order_number: order.order_number,
        tracking_number: tracking_number.trim()
      }
    });

  } catch (error) {
    console.error('更新運輸單號錯誤:', error);
    res.status(500).json({
      success: false,
      message: '更新運輸單號失敗'
    });
  }
});

// 管理員：獲取運輸單號
router.get('/admin/:id/tracking', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Database.get(
      'SELECT id, order_number, tracking_number, status FROM orders WHERE id = ?',
      [id]
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: '訂單不存在'
      });
    }

    res.json({
      success: true,
      data: {
        order_id: order.id,
        order_number: order.order_number,
        tracking_number: order.tracking_number,
        status: order.status
      }
    });

  } catch (error) {
    console.error('獲取運輸單號錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取運輸單號失敗'
    });
  }
});

// 管理員：更新訂單狀態
router.put('/admin/:id/status', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: '無效的訂單狀態'
      });
    }

    const result = await Database.run(
      'UPDATE orders SET status = ? WHERE id = ?',
      [status, id]
    );

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: '訂單不存在'
      });
    }

    res.json({
      success: true,
      message: '訂單狀態更新成功'
    });

  } catch (error) {
    console.error('更新訂單狀態錯誤:', error);
    res.status(500).json({
      success: false,
      message: '更新訂單狀態失敗'
    });
  }
});

// 管理員：導出訂單為 Excel
router.post('/admin/export', authenticateAdmin, async (req, res) => {
  try {
    const { order_ids } = req.body;

    if (!Array.isArray(order_ids) || order_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '請選擇要導出的訂單'
      });
    }

    // 獲取訂單數據
    const placeholders = order_ids.map(() => '?').join(',');
    const orders = await Database.all(
      `SELECT * FROM orders WHERE id IN (${placeholders}) ORDER BY created_at DESC`,
      order_ids
    );

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: '未找到指定的訂單'
      });
    }

    // 為每個訂單獲取訂單項目並合併到一行
    const exportData = [];
    for (const order of orders) {
      const items = await Database.all(
        'SELECT * FROM order_items WHERE order_id = ?',
        [order.id]
      );

      // 統計商品和規格數量
      const productMap = new Map();

      console.log('🔍 開始處理訂單項目，總數:', items.length);

      items.forEach((item, index) => {
        console.log(`📦 處理項目 ${index + 1}:`, {
          product_name: item.product_name,
          quantity: item.quantity,
          price: item.product_price,
          flavors_raw: item.flavors
        });

        let flavors = [];
        try {
          flavors = item.flavors ? JSON.parse(item.flavors) : [];
        } catch (error) {
          console.log('❌ 解析 flavors 失敗:', error);
          flavors = [];
        }

        // 確保flavors是數組
        if (!Array.isArray(flavors)) {
          flavors = [];
        }

        console.log(`📋 規格處理結果:`, {
          原始: flavors,
          數量: item.quantity
        });

        // 創建商品鍵：商品名稱 + 價格
        const productKey = `${item.product_name}|${item.product_price}`;

        if (!productMap.has(productKey)) {
          productMap.set(productKey, {
            product_name: item.product_name,
            product_price: item.product_price,
            flavorCounts: new Map(), // 規格計數器
            totalQuantity: 0
          });
        }

        const productData = productMap.get(productKey);
        productData.totalQuantity += item.quantity;

        // 統計每個規格的數量
        if (flavors.length > 0) {
          // 如果有多個規格，平均分配數量
          const quantityPerFlavor = item.quantity / flavors.length;
          flavors.forEach(flavor => {
            const currentCount = productData.flavorCounts.get(flavor) || 0;
            productData.flavorCounts.set(flavor, currentCount + quantityPerFlavor);
          });
        } else {
          // 沒有規格的商品
          const currentCount = productData.flavorCounts.get('無規格') || 0;
          productData.flavorCounts.set('無規格', currentCount + item.quantity);
        }

        console.log(`🔑 產品鍵: "${productKey}"`);
        console.log(`📊 當前規格統計:`, Array.from(productData.flavorCounts.entries()));
      });

      console.log('📊 最終產品統計:', Array.from(productMap.entries()).map(([key, value]) => ({
        key,
        product: value.product_name,
        totalQuantity: value.totalQuantity,
        flavors: Array.from(value.flavorCounts.entries())
      })));

      // 將合併後的商品信息轉換為字符串
      const productDetails = Array.from(productMap.values()).map(item => {
        // 構建規格詳情字符串
        let flavorText = '';
        if (item.flavorCounts.size > 0) {
          const flavorDetails = Array.from(item.flavorCounts.entries())
            .filter(([flavor, count]) => flavor !== '無規格') // 過濾掉無規格標記
            .map(([flavor, count]) => {
              // 如果是整數，直接顯示；如果是小數，保留一位小數
              const displayCount = count % 1 === 0 ? count.toString() : count.toFixed(1);
              return `${flavor}x${displayCount}`;
            })
            .join(',');

          if (flavorDetails) {
            flavorText = `(${flavorDetails})`;
          }
        }

        return `${item.product_name}${flavorText} x${item.totalQuantity} NT$${item.product_price}`;
      }).join(' | ');

      console.log('📝 最終導出字符串:', productDetails);

      // 計算總數量
      const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

      // 計算商品小計（不含運費）
      const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);

      // 計算運費（訂單總額 - 商品小計）
      const shippingFee = order.total_amount - subtotal;

      // 判斷是否免運
      const isShippingFree = shippingFee === 0;
      const shippingDisplay = isShippingFree ? '免運' : `NT$${shippingFee}`;

      console.log('💰 費用計算:', {
        商品小計: subtotal,
        運費: shippingFee,
        訂單總額: order.total_amount,
        是否免運: isShippingFree
      });

      // 每個訂單只產生一行數據
      exportData.push({
        '訂單號': order.order_number,
        '下單時間': order.created_at,
        '客戶姓名': order.customer_name,
        '客戶電話': order.customer_phone,
        '店號': order.store_number,
        '商品詳情': productDetails,
        '總數量': totalQuantity,
        '商品小計': subtotal,
        '運費': shippingDisplay,
        '訂單總額': order.total_amount,
        '訂單狀態': order.status,
        '是否已驗證': order.is_verified ? '是' : '否'
      });
    }

    // 創建 Excel 文件
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '訂單數據');

    // 生成文件名 DOC{年}{日}{月}
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const filename = `DOC${year}${day}${month}.xlsx`;

    // 確保導出目錄存在
    const exportDir = path.join(__dirname, '../exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const filepath = path.join(exportDir, filename);
    XLSX.writeFile(wb, filepath);

    // 發送文件
    res.download(filepath, filename, (err) => {
      if (err) {
        console.error('下載文件錯誤:', err);
      }
      // 下載完成後刪除文件
      setTimeout(() => {
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
      }, 60000); // 1分鐘後刪除
    });

  } catch (error) {
    console.error('導出訂單錯誤:', error);
    res.status(500).json({
      success: false,
      message: '導出訂單失敗'
    });
  }
});

// 管理員：重新發送 Telegram 通知
router.post('/admin/:id/resend-telegram', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Database.get('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: '訂單不存在'
      });
    }

    const orderItems = await Database.all('SELECT * FROM order_items WHERE order_id = ?', [id]);
    
    const telegramSent = await sendTelegramNotification(order, orderItems);
    
    if (telegramSent) {
      await Database.run('UPDATE orders SET telegram_sent = true WHERE id = ?', [id]);
      res.json({
        success: true,
        message: 'Telegram 通知發送成功'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Telegram 通知發送失敗'
      });
    }

  } catch (error) {
    console.error('重新發送 Telegram 通知錯誤:', error);
    res.status(500).json({
      success: false,
      message: '重新發送通知失敗'
    });
  }
});

// 管理員：批量刪除訂單（必須在單個刪除之前）
router.delete('/admin/batch', authenticateAdmin, async (req, res) => {
  try {
    const { order_ids } = req.body;

    if (!Array.isArray(order_ids) || order_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '請選擇要刪除的訂單'
      });
    }

    console.log('🗑️  批量刪除訂單請求，IDs:', order_ids);

    // 檢查數據庫類型並正確處理事務
    const isPostgreSQL = !!process.env.DATABASE_URL;
    let client = null;

    try {
      if (isPostgreSQL) {
        // PostgreSQL 事務處理
        client = await Database.beginTransaction();
      } else {
        // SQLite 事務處理
        await Database.beginTransaction();
      }
      let deletedCount = 0;

      for (const orderId of order_ids) {
        // 檢查訂單是否存在
        const order = await Database.get('SELECT * FROM orders WHERE id = ?', [orderId]);
        if (order) {
          // 刪除訂單項目
          await Database.run('DELETE FROM order_items WHERE order_id = ?', [orderId]);
          // 刪除訂單
          await Database.run('DELETE FROM orders WHERE id = ?', [orderId]);
          deletedCount++;
          console.log(`✅ 已刪除訂單: ${order.order_number}`);
        }
      }

      if (isPostgreSQL) {
        await Database.commit(client);
      } else {
        await Database.commit();
      }

      res.json({
        success: true,
        message: `成功刪除 ${deletedCount} 個訂單`
      });
    } catch (error) {
      console.error('❌ 事務執行失敗:', error);
      
      if (isPostgreSQL && client) {
        await Database.rollback(client);
      } else if (!isPostgreSQL) {
        await Database.rollback();
      }
      
      throw error;
    }
  } catch (error) {
    console.error('❌ 批量刪除訂單錯誤:', error);
    res.status(500).json({
      success: false,
      message: '批量刪除訂單失敗: ' + error.message
    });
  }
});

// 管理員：刪除單個訂單
router.delete('/admin/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️  刪除訂單請求，ID:', id);

    // 檢查訂單是否存在
    const order = await Database.get('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) {
      console.log('❌ 訂單不存在，ID:', id);
      return res.status(404).json({
        success: false,
        message: '訂單不存在'
      });
    }

    console.log('✅ 找到訂單:', order.order_number);

    // 檢查數據庫類型並正確處理事務
    const isPostgreSQL = !!process.env.DATABASE_URL;
    let client = null;

    try {
      if (isPostgreSQL) {
        // PostgreSQL 事務處理
        client = await Database.beginTransaction();
      } else {
        // SQLite 事務處理
        await Database.beginTransaction();
      }
      // 先刪除訂單項目
      await Database.run('DELETE FROM order_items WHERE order_id = ?', [id]);
      console.log('📝 已刪除訂單項目');

      // 再刪除訂單
      const result = await Database.run('DELETE FROM orders WHERE id = ?', [id]);
      console.log('📝 刪除結果:', result);

      if (isPostgreSQL) {
        await Database.commit(client);
      } else {
        await Database.commit();
      }

      res.json({
        success: true,
        message: '訂單已刪除'
      });
    } catch (error) {
      console.error('❌ 事務執行失敗:', error);
      
      if (isPostgreSQL && client) {
        await Database.rollback(client);
      } else if (!isPostgreSQL) {
        await Database.rollback();
      }
      
      throw error;
    }
  } catch (error) {
    console.error('❌ 刪除訂單錯誤:', error);
    res.status(500).json({
      success: false,
      message: '刪除訂單失敗: ' + error.message
    });
  }
});

module.exports = router;
