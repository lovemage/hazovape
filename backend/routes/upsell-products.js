const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Database = require('../config/database');
const { authenticateAdmin } = require('./auth');

const router = express.Router();

// 創建上傳目錄 - 支持 Railway Volume
const getUploadDir = () => {
  if (process.env.NODE_ENV === 'production') {
    // Railway 生產環境：使用 Volume 路徑
    return '/app/data/uploads/upsell';
  } else {
    // 本地開發環境：使用相對路徑
    return path.join(__dirname, '../uploads/upsell');
  }
};

const uploadDir = getUploadDir();
console.log('📁 加購商品圖片上傳目錄:', uploadDir);

// 確保上傳目錄存在
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('✅ 創建加購商品上傳目錄:', uploadDir);
}

// 配置圖片上傳
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'upsell-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('只允許上傳圖片文件 (jpeg, jpg, png, webp)'));
    }
  }
});

// 客戶端 API：獲取啟用的加購商品
router.get('/', async (req, res) => {
  try {
    const upsellProducts = await Database.all(`
      SELECT id, name, price, stock, images, description
      FROM upsell_products
      WHERE is_active = 1 AND stock > 0
      ORDER BY created_at DESC
    `);

    // 處理圖片路徑
    const processedProducts = upsellProducts.map(product => ({
      ...product,
      images: JSON.parse(product.images || '[]')
    }));

    res.json({
      success: true,
      data: processedProducts
    });
  } catch (error) {
    console.error('獲取加購商品失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取加購商品失敗'
    });
  }
});

// 管理員 API：獲取所有加購商品
router.get('/admin/all', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const upsellProducts = await Database.all(`
      SELECT * FROM upsell_products
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [parseInt(limit), offset]);

    const totalCount = await Database.get('SELECT COUNT(*) as total FROM upsell_products');

    // 處理圖片路徑
    const processedProducts = upsellProducts.map(product => ({
      ...product,
      images: JSON.parse(product.images || '[]')
    }));

    res.json({
      success: true,
      data: {
        products: processedProducts,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total: totalCount.total,
          total_pages: Math.ceil(totalCount.total / limit)
        }
      }
    });
  } catch (error) {
    console.error('獲取加購商品列表失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取加購商品列表失敗'
    });
  }
});

// 管理員 API：新增加購商品
router.post('/admin', authenticateAdmin, async (req, res) => {
  try {
    const { name, price, stock, description } = req.body;

    if (!name || !price || stock === undefined) {
      return res.status(400).json({
        success: false,
        message: '請填寫完整的商品信息'
      });
    }

    const result = await Database.run(`
      INSERT INTO upsell_products (name, price, stock, description, is_active)
      VALUES (?, ?, ?, ?, 1)
    `, [name, parseFloat(price), parseInt(stock), description || '']);

    res.json({
      success: true,
      data: { id: result.id },
      message: '加購商品創建成功'
    });
  } catch (error) {
    console.error('創建加購商品失敗:', error);
    res.status(500).json({
      success: false,
      message: '創建加購商品失敗'
    });
  }
});

// 管理員 API：更新加購商品
router.put('/admin/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, stock, description, is_active } = req.body;

    await Database.run(`
      UPDATE upsell_products
      SET name = ?, price = ?, stock = ?, description = ?, is_active = ?
      WHERE id = ?
    `, [name, parseFloat(price), parseInt(stock), description || '', is_active ? 1 : 0, id]);

    res.json({
      success: true,
      message: '加購商品更新成功'
    });
  } catch (error) {
    console.error('更新加購商品失敗:', error);
    res.status(500).json({
      success: false,
      message: '更新加購商品失敗'
    });
  }
});

// 管理員 API：上傳加購商品圖片
router.post('/admin/:id/upload', authenticateAdmin, upload.array('images', 5), async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: '請選擇要上傳的圖片'
      });
    }

    // 獲取當前商品的圖片
    const product = await Database.get('SELECT images FROM upsell_products WHERE id = ?', [id]);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: '加購商品不存在'
      });
    }

    const currentImages = JSON.parse(product.images || '[]');
    const newImages = req.files.map(file => file.filename);
    const allImages = [...currentImages, ...newImages];

    // 更新數據庫
    await Database.run(
      'UPDATE upsell_products SET images = ? WHERE id = ?',
      [JSON.stringify(allImages), id]
    );

    res.json({
      success: true,
      data: {
        uploaded_images: newImages,
        all_images: allImages
      },
      message: '圖片上傳成功'
    });
  } catch (error) {
    console.error('上傳圖片失敗:', error);
    res.status(500).json({
      success: false,
      message: '上傳圖片失敗'
    });
  }
});

// 管理員 API：刪除加購商品圖片
router.delete('/admin/:id/images/:imageName', authenticateAdmin, async (req, res) => {
  try {
    const { id, imageName } = req.params;

    // 獲取當前商品的圖片
    const product = await Database.get('SELECT images FROM upsell_products WHERE id = ?', [id]);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: '加購商品不存在'
      });
    }

    const currentImages = JSON.parse(product.images || '[]');
    const updatedImages = currentImages.filter(img => img !== imageName);

    // 刪除圖片文件
    const imagePath = path.join(uploadDir, imageName);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    // 更新數據庫
    await Database.run(
      'UPDATE upsell_products SET images = ? WHERE id = ?',
      [JSON.stringify(updatedImages), id]
    );

    res.json({
      success: true,
      data: { remaining_images: updatedImages },
      message: '圖片刪除成功'
    });
  } catch (error) {
    console.error('刪除圖片失敗:', error);
    res.status(500).json({
      success: false,
      message: '刪除圖片失敗'
    });
  }
});

// 管理員 API：刪除加購商品
router.delete('/admin/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // 獲取商品信息以刪除圖片
    const product = await Database.get('SELECT images FROM upsell_products WHERE id = ?', [id]);

    if (product) {
      const images = JSON.parse(product.images || '[]');
      // 刪除圖片文件
      images.forEach(imagePath => {
        const fullPath = path.join(uploadDir, imagePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      });
    }

    await Database.run('DELETE FROM upsell_products WHERE id = ?', [id]);

    res.json({
      success: true,
      message: '加購商品刪除成功'
    });
  } catch (error) {
    console.error('刪除加購商品失敗:', error);
    res.status(500).json({
      success: false,
      message: '刪除加購商品失敗'
    });
  }
});

module.exports = router;
