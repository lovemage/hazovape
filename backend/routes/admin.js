const express = require('express');
const Database = require('../config/database');
const { authenticateAdmin } = require('./auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// 取得靜態檔案上傳目錄 - 支持 Railway Volume
const getStaticUploadDir = () => {
  if (process.env.NODE_ENV === 'production') {
    // Railway 生產環境：使用 Volume 路徑
    return '/app/data/uploads/static';
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

// 配置 multer 用於圖片上傳
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, staticUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `popup-${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
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
    // 獲取統計數據
    const [
      totalProducts,
      activeProducts,
      totalFlavors,
      activeFlavors,
      totalOrders,
      pendingOrders,
      totalRevenue,
      todayOrders
    ] = await Promise.all([
      Database.get('SELECT COUNT(*) as count FROM products'),
      Database.get('SELECT COUNT(*) as count FROM products WHERE is_active = 1'),
      Database.get('SELECT COUNT(*) as count FROM flavors'),
      Database.get('SELECT COUNT(*) as count FROM flavors WHERE is_active = 1'),
      Database.get('SELECT COUNT(*) as count FROM orders'),
      Database.get('SELECT COUNT(*) as count FROM orders WHERE status = "pending"'),
      Database.get('SELECT SUM(total_amount) as total FROM orders WHERE status != "cancelled"'),
      Database.get(`SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = DATE('now')`)
    ]);

    // 獲取最近7天的訂單統計
    const recentOrders = await Database.all(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        SUM(total_amount) as revenue
      FROM orders 
      WHERE created_at >= DATE('now', '-7 days')
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    // 獲取熱門商品
    const popularProducts = await Database.all(`
      SELECT 
        oi.product_name,
        SUM(oi.quantity) as total_sold,
        SUM(oi.subtotal) as total_revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status != 'cancelled'
      GROUP BY oi.product_id, oi.product_name
      ORDER BY total_sold DESC
      LIMIT 10
    `);

    // 獲取最近訂單
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
      LIMIT 10
    `);

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

    let dateFormat, groupByClause;
    switch (group_by) {
      case 'month':
        dateFormat = '%Y-%m';
        groupByClause = "strftime('%Y-%m', created_at)";
        break;
      case 'week':
        dateFormat = '%Y-W%W';
        groupByClause = "strftime('%Y-W%W', created_at)";
        break;
      case 'day':
      default:
        dateFormat = '%Y-%m-%d';
        groupByClause = "strftime('%Y-%m-%d', created_at)";
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
    const settings = await Database.all('SELECT * FROM system_settings ORDER BY setting_key');

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
          `INSERT OR REPLACE INTO system_settings (setting_key, setting_value, updated_at)
           VALUES (?, ?, CURRENT_TIMESTAMP)`,
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

    const testMessage = `🤖 Mist Mall 測試消息\n\n✅ Telegram Bot 連接成功！\n🕐 測試時間: ${new Date().toLocaleString('zh-TW')}\n\n📋 環境變數配置正確`;

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
        system_settings: await Database.all('SELECT * FROM system_settings')
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
      await Database.run('DELETE FROM system_settings');

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
      if (backupData.data.system_settings) {
        for (const setting of backupData.data.system_settings) {
          await Database.run(
            'INSERT INTO system_settings (id, setting_key, setting_value, description, updated_at) VALUES (?, ?, ?, ?, ?)',
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

// 管理員：上傳廣告彈窗圖片
router.post('/upload-image', authenticateAdmin, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '請選擇要上傳的圖片'
      });
    }

    // 刪除舊的彈窗圖片（如果有的話）
    try {
      const oldImageSetting = await Database.get(
        'SELECT setting_value FROM system_settings WHERE setting_key = ?',
        ['popup_image']
      );
      
      if (oldImageSetting && oldImageSetting.setting_value) {
        const oldImagePath = path.join(staticUploadDir, path.basename(oldImageSetting.setting_value));
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
          console.log('🗑️ 刪除舊圖片:', oldImagePath);
        }
      }
    } catch (error) {
      console.error('刪除舊圖片失敗:', error);
    }

    // 生成相對路徑
    const imagePath = `/uploads/static/${req.file.filename}`;
    
    console.log('✅ 圖片上傳成功:', imagePath);

    res.json({
      success: true,
      message: '圖片上傳成功',
      data: {
        path: imagePath,
        filename: req.file.filename,
        size: req.file.size
      }
    });

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

    // 從路徑中提取檔案名
    const filename = path.basename(imagePath);
    const fullPath = path.join(staticUploadDir, filename);

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log('🗑️ 圖片刪除成功:', fullPath);

      res.json({
        success: true,
        message: '圖片刪除成功'
      });
    } else {
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
