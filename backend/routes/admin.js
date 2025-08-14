const express = require('express');
const Database = require('../config/database');
const { authenticateAdmin } = require('./auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const runProductionMigrations = require('../scripts/production-migrate');
const { uploadBufferToCloudinary, deleteFromCloudinary, extractPublicIdFromUrl } = require('../config/cloudinary');

const router = express.Router();

// 取得靜態檔案上傳目錄 - 支持 Railway Volume 和 Heroku
const getStaticUploadDir = () => {
  // 優先使用環境變數 UPLOADS_PATH（用於 Railway Volume）
  if (process.env.UPLOADS_PATH) {
    return path.join(process.env.UPLOADS_PATH, 'static');
  }
  
  if (process.env.NODE_ENV === 'production') {
    // Heroku 生產環境：使用 dist 目錄中的 uploads
    return path.join(__dirname, '../dist/uploads/static');
  } else {
    // 本地開發環境：使用相對路徑
    return path.join(__dirname, '../uploads/static');
  }
};

const staticUploadDir = getStaticUploadDir();
console.log('📁 靜態檔案上傳目錄:', staticUploadDir);

// 確保目錄存在
if (!fs.existsSync(staticUploadDir)) {
  fs.mkdirSync(staticUploadDir, { recursive: true });
  console.log('✅ 創建靜態檔案目錄:', staticUploadDir);
}

// 配置 multer 使用內存存儲（用於 Cloudinary 上傳）
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      cb(null, true);
    } else {
      cb(new Error('只允許上傳 JPEG, JPG, PNG, GIF, WEBP 格式的圖片'));
    }
  }
});

// 管理員：獲取統計數據
router.get('/dashboard', authenticateAdmin, async (req, res) => {
  try {
    // 獲取統計數據 - 分步驟執行以便調試
    console.log('📊 獲取儀表板統計數據...');
    
    const totalProducts = await Database.get('SELECT COUNT(*) as count FROM products');
    console.log('✅ 產品總數:', totalProducts);
    
    const activeProducts = await Database.get('SELECT COUNT(*) as count FROM products WHERE is_active = true');
    console.log('✅ 啟用產品:', activeProducts);
    
    const totalFlavors = await Database.get('SELECT COUNT(*) as count FROM flavors');
    console.log('✅ 規格總數:', totalFlavors);
    
    const activeFlavors = await Database.get('SELECT COUNT(*) as count FROM flavors WHERE is_active = true');
    console.log('✅ 啟用規格:', activeFlavors);
    
    const totalOrders = await Database.get('SELECT COUNT(*) as count FROM orders');
    console.log('✅ 訂單總數:', totalOrders);
    
    const pendingOrders = await Database.get("SELECT COUNT(*) as count FROM orders WHERE status = 'pending'");
    console.log('✅ 待處理訂單:', pendingOrders);
    
    const totalRevenue = await Database.get("SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status != 'cancelled'");
    console.log('✅ 總營收:', totalRevenue);
    
    const todayOrders = await Database.get(`SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = CURRENT_DATE`);
    console.log('✅ 今日訂單:', todayOrders);

    // 簡化查詢以避免複雜的統計導致錯誤
    const recentOrders = [];
    const popularProducts = [];
    const latestOrders = await Database.all(`
      SELECT 
        id,
        order_number,
        customer_name,
        customer_phone,
        total_amount,
        status,
        created_at
      FROM orders 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    console.log('✅ 最近訂單:', latestOrders);

    res.json({
      success: true,
      data: {
        statistics: {
          products: {
            total: totalProducts.count,
            active: activeProducts.count
          },
          flavors: {
            total: totalFlavors.count,
            active: activeFlavors.count
          },
          orders: {
            total: totalOrders.count,
            pending: pendingOrders.count,
            today: todayOrders.count
          },
          revenue: {
            total: totalRevenue.total || 0
          }
        },
        charts: {
          recent_orders: recentOrders,
          popular_products: popularProducts
        },
        latest_orders: latestOrders
      }
    });

  } catch (error) {
    console.error('獲取統計數據錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取統計數據失敗'
    });
  }
});

// 管理員：獲取系統信息
router.get('/system-info', authenticateAdmin, async (req, res) => {
  try {
    const systemInfo = {
      version: '1.0.0',
      database: 'SQLite',
      node_version: process.version,
      uptime: process.uptime(),
      memory_usage: process.memoryUsage(),
      platform: process.platform,
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: systemInfo
    });

  } catch (error) {
    console.error('獲取系統信息錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取系統信息失敗'
    });
  }
});

// 管理員：獲取銷售報告
router.get('/sales-report', authenticateAdmin, async (req, res) => {
  try {
    const { start_date, end_date, group_by = 'day' } = req.query;

    let groupByClause;
    switch (group_by) {
      case 'month':
        groupByClause = "TO_CHAR(created_at, 'YYYY-MM')";
        break;
      case 'week':
        groupByClause = "TO_CHAR(created_at, 'YYYY-\"W\"WW')";
        break;
      case 'day':
      default:
        groupByClause = "TO_CHAR(created_at, 'YYYY-MM-DD')";
        break;
    }

    let whereClause = "WHERE status != 'cancelled'";
    const params = [];

    if (start_date) {
      whereClause += " AND DATE(created_at) >= ?";
      params.push(start_date);
    }

    if (end_date) {
      whereClause += " AND DATE(created_at) <= ?";
      params.push(end_date);
    }

    const salesData = await Database.all(`
      SELECT 
        ${groupByClause} as period,
        COUNT(*) as order_count,
        SUM(total_amount) as total_revenue,
        AVG(total_amount) as avg_order_value
      FROM orders 
      ${whereClause}
      GROUP BY ${groupByClause}
      ORDER BY period DESC
    `, params);

    // 獲取商品銷售統計
    const productSales = await Database.all(`
      SELECT 
        oi.product_name,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.subtotal) as total_revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      ${whereClause}
      GROUP BY oi.product_id, oi.product_name
      ORDER BY total_revenue DESC
    `, params);

    res.json({
      success: true,
      data: {
        sales_by_period: salesData,
        product_sales: productSales,
        summary: {
          total_orders: salesData.reduce((sum, item) => sum + item.order_count, 0),
          total_revenue: salesData.reduce((sum, item) => sum + item.total_revenue, 0),
          avg_order_value: salesData.length > 0 
            ? salesData.reduce((sum, item) => sum + item.avg_order_value, 0) / salesData.length 
            : 0
        }
      }
    });

  } catch (error) {
    console.error('獲取銷售報告錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取銷售報告失敗'
    });
  }
});

// 管理員：獲取系統設置
router.get('/settings', authenticateAdmin, async (req, res) => {
  try {
    const settings = await Database.all('SELECT * FROM site_settings ORDER BY setting_key');

    // 轉換為對象格式
    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.setting_key] = {
        value: setting.setting_value,
        description: setting.description,
        updated_at: setting.updated_at
      };
    });

    res.json({
      success: true,
      data: settingsObj
    });

  } catch (error) {
    console.error('獲取系統設置錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取系統設置失敗'
    });
  }
});

// 管理員：更新系統設置
router.put('/settings', authenticateAdmin, async (req, res) => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        success: false,
        message: '設置數據格式錯誤'
      });
    }

    await Database.beginTransaction();

    try {
      for (const [key, value] of Object.entries(settings)) {
        await Database.run(
          `INSERT INTO site_settings (setting_key, setting_value, updated_at)
           VALUES (?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT (setting_key) DO UPDATE SET
           setting_value = EXCLUDED.setting_value,
           updated_at = EXCLUDED.updated_at`,
          [key, value]
        );
      }

      await Database.commit();

      res.json({
        success: true,
        message: '設置更新成功'
      });

    } catch (error) {
      await Database.rollback();
      throw error;
    }

  } catch (error) {
    console.error('更新系統設置錯誤:', error);
    res.status(500).json({
      success: false,
      message: '更新系統設置失敗'
    });
  }
});

// 管理員：測試Telegram連接
router.post('/test-telegram', authenticateAdmin, async (req, res) => {
  try {
    const bot_token = process.env.TELEGRAM_BOT_TOKEN;
    const chat_id = process.env.TELEGRAM_CHAT_ID;

    if (!bot_token || !chat_id) {
      return res.status(400).json({
        success: false,
        message: '請在 Railway 環境變數中設置 TELEGRAM_BOT_TOKEN 和 TELEGRAM_CHAT_ID'
      });
    }

    // 測試發送消息
    const TelegramBot = require('node-telegram-bot-api');
    const testBot = new TelegramBot(bot_token, { polling: false });

    const testMessage = `🤖 VJVape 測試消息\n\n✅ Telegram Bot 連接成功！\n🕐 測試時間: ${new Date().toLocaleString('zh-TW')}\n\n📋 環境變數配置正確`;

    await testBot.sendMessage(chat_id, testMessage);

    res.json({
      success: true,
      message: 'Telegram連接測試成功，請檢查您的聊天室'
    });

  } catch (error) {
    console.error('Telegram連接測試失敗:', error);

    let errorMessage = 'Telegram連接測試失敗';
    if (error.code === 'ETELEGRAM') {
      if (error.response && error.response.body) {
        const body = error.response.body;
        if (body.error_code === 400) {
          errorMessage = 'Bot Token或Chat ID無效，請檢查 Railway 環境變數';
        } else if (body.error_code === 401) {
          errorMessage = 'Bot Token無效或已過期，請更新 Railway 環境變數';
        } else if (body.error_code === 403) {
          errorMessage = 'Bot被封鎖或Chat ID無效，請檢查 Railway 環境變數';
        }
      }
    }

    res.status(400).json({
      success: false,
      message: errorMessage,
      error: error.message
    });
  }
});

// 數據備份：導出所有數據
router.get('/export-data', authenticateAdmin, async (req, res) => {
  try {
    console.log('📦 開始導出數據備份...');

    // 獲取所有表的數據
    const backup = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      data: {
        products: await Database.all('SELECT * FROM products'),
        flavors: await Database.all('SELECT * FROM flavors'),
        flavor_categories: await Database.all('SELECT * FROM flavor_categories'),
        orders: await Database.all('SELECT * FROM orders'),
        order_items: await Database.all('SELECT * FROM order_items'),
        announcements: await Database.all('SELECT * FROM announcements'),
        site_settings: await Database.all('SELECT * FROM site_settings')
      }
    };

    console.log('✅ 數據導出完成');
    console.log('📊 導出統計：');
    console.log(`- 商品: ${backup.data.products.length}`);
    console.log(`- 規格: ${backup.data.flavors.length}`);
    console.log(`- 訂單: ${backup.data.orders.length}`);
    console.log(`- 公告: ${backup.data.announcements.length}`);

    // 生成文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `mistmall-backup-${timestamp}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(backup);

  } catch (error) {
    console.error('❌ 導出數據失敗:', error);
    res.status(500).json({
      success: false,
      message: '導出數據失敗: ' + error.message
    });
  }
});

// 數據備份：導入數據
router.post('/import-data', authenticateAdmin, async (req, res) => {
  try {
    if (!req.files || !req.files.backup) {
      return res.status(400).json({
        success: false,
        message: '請選擇備份文件'
      });
    }

    const backupFile = req.files.backup;
    const backupData = JSON.parse(backupFile.data.toString());

    console.log('📥 開始導入數據備份...');
    console.log('📅 備份時間:', backupData.timestamp);

    if (!backupData.data) {
      return res.status(400).json({
        success: false,
        message: '備份文件格式錯誤'
      });
    }

    await Database.beginTransaction();

    try {
      // 清空現有數據（除了管理員用戶）
      await Database.run('DELETE FROM order_items');
      await Database.run('DELETE FROM orders');
      await Database.run('DELETE FROM flavors');
      await Database.run('DELETE FROM products');
      await Database.run('DELETE FROM flavor_categories');
      await Database.run('DELETE FROM announcements');
      await Database.run('DELETE FROM site_settings');

      // 導入規格類別
      if (backupData.data.flavor_categories) {
        for (const category of backupData.data.flavor_categories) {
          await Database.run(
            'INSERT INTO flavor_categories (id, name, description, sort_order, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            [category.id, category.name, category.description, category.sort_order, category.is_active, category.created_at]
          );
        }
      }

      // 導入商品
      if (backupData.data.products) {
        for (const product of backupData.data.products) {
          await Database.run(
            'INSERT INTO products (id, name, price, multi_discount, images, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [product.id, product.name, product.price, product.multi_discount, product.images, product.is_active, product.created_at, product.updated_at]
          );
        }
      }

      // 導入規格
      if (backupData.data.flavors) {
        for (const flavor of backupData.data.flavors) {
          await Database.run(
            'INSERT INTO flavors (id, name, product_id, category_id, sort_order, stock, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [flavor.id, flavor.name, flavor.product_id, flavor.category_id, flavor.sort_order, flavor.stock, flavor.is_active, flavor.created_at, flavor.updated_at]
          );
        }
      }

      // 導入訂單
      if (backupData.data.orders) {
        for (const order of backupData.data.orders) {
          await Database.run(
            'INSERT INTO orders (id, order_number, customer_name, customer_phone, store_number, total_amount, status, verification_code, is_verified, telegram_sent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [order.id, order.order_number, order.customer_name, order.customer_phone, order.store_number, order.total_amount, order.status, order.verification_code, order.is_verified, order.telegram_sent, order.created_at]
          );
        }
      }

      // 導入訂單項目
      if (backupData.data.order_items) {
        for (const item of backupData.data.order_items) {
          await Database.run(
            'INSERT INTO order_items (id, order_id, product_id, product_name, quantity, unit_price, subtotal, flavors) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [item.id, item.order_id, item.product_id, item.product_name, item.quantity, item.unit_price, item.subtotal, item.flavors]
          );
        }
      }

      // 導入公告
      if (backupData.data.announcements) {
        for (const announcement of backupData.data.announcements) {
          await Database.run(
            'INSERT INTO announcements (id, title, content, is_active, priority, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            [announcement.id, announcement.title, announcement.content, announcement.is_active, announcement.priority, announcement.created_at]
          );
        }
      }

      // 導入系統設置
      if (backupData.data.site_settings || backupData.data.system_settings) {
        const settings = backupData.data.site_settings || backupData.data.system_settings;
        for (const setting of settings) {
          await Database.run(
            'INSERT INTO site_settings (id, setting_key, setting_value, description, updated_at) VALUES (?, ?, ?, ?, ?)',
            [setting.id, setting.setting_key, setting.setting_value, setting.description, setting.updated_at]
          );
        }
      }

      await Database.commit();

      console.log('✅ 數據導入完成');
      res.json({
        success: true,
        message: '數據導入成功'
      });

    } catch (error) {
      await Database.rollback();
      throw error;
    }

  } catch (error) {
    console.error('❌ 導入數據失敗:', error);
    res.status(500).json({
      success: false,
      message: '導入數據失敗: ' + error.message
    });
  }
});

// 管理員：上傳廣告彈窗圖片（使用 Cloudinary）
router.post('/upload-image', authenticateAdmin, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '請選擇要上傳的圖片'
      });
    }

    console.log('☁️ 開始上傳圖片到 Cloudinary...', req.file.originalname);

    // 上傳圖片到 Cloudinary
    try {
      const result = await uploadBufferToCloudinary(req.file.buffer, {
        folder: 'meelfull/static',
        public_id: `popup_${Date.now()}`
      });

      console.log('✅ Cloudinary 上傳成功:', result.secure_url);

      res.json({
        success: true,
        message: '圖片上傳成功',
        data: {
          path: result.secure_url,
          filename: result.public_id,
          size: req.file.size,
          cloudinary_url: result.secure_url
        }
      });

    } catch (cloudinaryError) {
      console.error('❌ Cloudinary 上傳失敗:', cloudinaryError.message);
      throw new Error('圖片上傳到雲端失敗: ' + cloudinaryError.message);
    }

  } catch (error) {
    console.error('❌ 上傳圖片失敗:', error);
    res.status(500).json({
      success: false,
      message: error.message || '圖片上傳失敗'
    });
  }
});

// 管理員：刪除廣告彈窗圖片
router.delete('/delete-image', authenticateAdmin, async (req, res) => {
  try {
    const { path: imagePath } = req.body;

    if (!imagePath) {
      return res.status(400).json({
        success: false,
        message: '請提供要刪除的圖片路徑'
      });
    }

    console.log('🗑️ 準備刪除圖片，原始路徑:', imagePath);

    // 處理不同的圖片路徑格式
    let fullPath;
    
    if (imagePath.startsWith('/uploads/static/')) {
      // 路徑格式：/uploads/static/filename.jpg
      const filename = path.basename(imagePath);
      fullPath = path.join(staticUploadDir, filename);
    } else if (imagePath.startsWith('uploads/static/')) {
      // 路徑格式：uploads/static/filename.jpg  
      const filename = path.basename(imagePath);
      fullPath = path.join(staticUploadDir, filename);
    } else if (imagePath.startsWith('/uploads/')) {
      // 路徑格式：/uploads/其他子目錄/filename.jpg
      const relativePath = imagePath.replace('/uploads/', '');
      
      let uploadsRoot;
      if (process.env.UPLOADS_PATH) {
        // Railway Volume 環境
        uploadsRoot = process.env.UPLOADS_PATH;
      } else if (process.env.NODE_ENV === 'production') {
        // Heroku 生產環境
        uploadsRoot = path.join(__dirname, '../dist/uploads');
      } else {
        // 本地開發環境
        uploadsRoot = path.join(__dirname, '../uploads');
      }
      
      fullPath = path.join(uploadsRoot, relativePath);
    } else {
      // 假設是相對於 staticUploadDir 的文件名
      fullPath = path.join(staticUploadDir, imagePath);
    }

    console.log('🔍 計算出的完整路徑:', fullPath);
    console.log('📂 靜態上傳目錄:', staticUploadDir);

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log('✅ 圖片刪除成功:', fullPath);

      res.json({
        success: true,
        message: '圖片刪除成功'
      });
    } else {
      console.log('❌ 圖片不存在於路徑:', fullPath);
      res.status(404).json({
        success: false,
        message: '圖片不存在'
      });
    }

  } catch (error) {
    console.error('❌ 刪除圖片失敗:', error);
    res.status(500).json({
      success: false,
      message: error.message || '圖片刪除失敗'
    });
  }
});

// 管理員：運行數據庫遷移
router.post('/migrate', authenticateAdmin, async (req, res) => {
  try {
    console.log('🚀 管理員請求運行數據庫遷移...');
    
    await runProductionMigrations();
    
    res.json({
      success: true,
      message: '數據庫遷移完成！現在可以使用產品排序功能。'
    });
  } catch (error) {
    console.error('❌ 數據庫遷移失敗:', error);
    res.status(500).json({
      success: false,
      message: '數據庫遷移失敗: ' + error.message
    });
  }
});

module.exports = router;
