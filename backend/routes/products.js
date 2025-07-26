const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const Database = require('../config/database');
const { authenticateAdmin } = require('./auth');

const router = express.Router();

// 創建上傳目錄 - 支持 Railway Volume
const getUploadDir = () => {
  if (process.env.NODE_ENV === 'production') {
    // Railway 生產環境：使用 Volume 路徑
    return '/app/data/uploads/products';
  } else {
    // 本地開發環境：使用相對路徑
    return path.join(__dirname, '../uploads/products');
  }
};

const uploadDir = getUploadDir();
console.log('📁 圖片上傳目錄:', uploadDir);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('✅ 創建上傳目錄:', uploadDir);
}

// 配置 multer 用於圖片上傳
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 5 // 最多5個文件
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

// 獲取所有產品（前端用戶）
router.get('/', async (req, res) => {
  try {
    const products = await Database.all(
      'SELECT id, name, description, price, multi_discount, images, is_active FROM products WHERE is_active = 1 ORDER BY id'
    );

    // 解析 JSON 字段並獲取規格數據
    const formattedProducts = await Promise.all(
      products.map(async (product) => {
        // 從 flavors 表獲取規格數據
        const flavors = await Database.all(`
          SELECT f.id, f.name, f.sort_order, f.stock, f.category_id,
                 fc.name as category_name
          FROM flavors f
          LEFT JOIN flavor_categories fc ON f.category_id = fc.id
          WHERE f.product_id = ? AND f.is_active = 1
          ORDER BY fc.sort_order, f.sort_order, f.id
        `, [product.id]);

        return {
          ...product,
          multi_discount: product.multi_discount ? JSON.parse(product.multi_discount) : {},
          images: product.images ? JSON.parse(product.images) : [],
          variants: flavors // 使用 flavors 表的數據
        };
      })
    );

    res.json({
      success: true,
      data: formattedProducts
    });
  } catch (error) {
    console.error('獲取產品列表錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取產品列表失敗'
    });
  }
});

// 獲取單個產品詳情
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const product = await Database.get(
      'SELECT id, name, description, price, multi_discount, images, is_active, created_at FROM products WHERE id = ? AND is_active = 1',
      [id]
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: '產品不存在'
      });
    }

    // 從 flavors 表獲取規格數據
    const flavors = await Database.all(`
      SELECT f.id, f.name, f.sort_order, f.stock, f.category_id,
             fc.name as category_name
      FROM flavors f
      LEFT JOIN flavor_categories fc ON f.category_id = fc.id
      WHERE f.product_id = ? AND f.is_active = 1
      ORDER BY fc.sort_order, f.sort_order, f.id
    `, [id]);

    // 解析 JSON 字段
    const formattedProduct = {
      ...product,
      multi_discount: product.multi_discount ? JSON.parse(product.multi_discount) : {},
      images: product.images ? JSON.parse(product.images) : [],
      variants: flavors // 使用 flavors 表的數據
    };

    res.json({
      success: true,
      data: formattedProduct
    });
  } catch (error) {
    console.error('獲取產品詳情錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取產品詳情失敗'
    });
  }
});

// 管理員：獲取所有產品（包括停用的）
router.get('/admin/all', authenticateAdmin, async (req, res) => {
  try {
    const products = await Database.all(
      'SELECT * FROM products ORDER BY created_at DESC'
    );

    // 解析 JSON 字段
    const formattedProducts = products.map(product => ({
      ...product,
      multi_discount: product.multi_discount ? JSON.parse(product.multi_discount) : {},
      images: product.images ? JSON.parse(product.images) : []
    }));

    res.json({
      success: true,
      data: formattedProducts
    });
  } catch (error) {
    console.error('獲取產品列表錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取產品列表失敗'
    });
  }
});

// 管理員：創建產品
router.post('/admin', authenticateAdmin, upload.array('images', 5), async (req, res) => {
  try {
    const { name, description, price, multi_discount, existing_images } = req.body;

    console.log('🆕 創建產品請求');
    console.log('📝 請求數據:', { name, price, existing_images });
    console.log('📁 上傳文件數量:', req.files?.length || 0);
    if (req.files && req.files.length > 0) {
      console.log('📁 上傳文件詳情:', req.files.map(f => ({ name: f.originalname, size: f.size, mimetype: f.mimetype })));
    }

    if (!name || !price) {
      return res.status(400).json({
        success: false,
        message: '產品名稱和價格不能為空'
      });
    }

    // 處理圖片 - 支持文件上傳和 URL
    let allImages = [];

    // 處理現有圖片（URL）
    if (existing_images) {
      const existingList = typeof existing_images === 'string'
        ? JSON.parse(existing_images)
        : existing_images;

      if (Array.isArray(existingList)) {
        allImages = existingList;
        console.log('📸 現有圖片 URLs:', allImages);
      }
    }

    // 處理上傳的圖片文件
    if (req.files && req.files.length > 0) {
      const uploadedImages = req.files.map(file => {
        console.log('📤 處理上傳文件:', file.originalname, '→', file.filename);
        return `products/${file.filename}`;
      });
      allImages = [...allImages, ...uploadedImages];
      console.log('📤 新上傳圖片:', uploadedImages);
    }

    // 限制最多5張圖片
    allImages = allImages.slice(0, 5);
    console.log('🖼️ 最終圖片列表:', allImages);

    // 處理多件優惠數據
    let parsedMultiDiscount = {};
    if (multi_discount) {
      try {
        parsedMultiDiscount = typeof multi_discount === 'string' 
          ? JSON.parse(multi_discount) 
          : multi_discount;
      } catch (e) {
        console.warn('多件優惠數據格式錯誤:', e);
      }
    }

    const result = await Database.run(
      `INSERT INTO products (name, description, price, multi_discount, images)
       VALUES (?, ?, ?, ?, ?)`,
      [
        name,
        description || '',
        parseFloat(price),
        JSON.stringify(parsedMultiDiscount),
        JSON.stringify(allImages)
      ]
    );

    console.log('✅ 產品創建成功，ID:', result.id);
    console.log('💾 保存的圖片數據:', JSON.stringify(allImages));

    res.json({
      success: true,
      message: '產品創建成功',
      data: { id: result.id }
    });
  } catch (error) {
    console.error('創建產品錯誤:', error);
    res.status(500).json({
      success: false,
      message: '創建產品失敗'
    });
  }
});

// 管理員：更新產品
router.put('/admin/:id', authenticateAdmin, upload.array('images', 5), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, multi_discount, existing_images } = req.body;

    console.log('🔄 更新產品請求，ID:', id);
    console.log('📝 請求數據:', { name, price, existing_images });
    console.log('📁 上傳文件:', req.files?.length || 0);

    // 檢查產品是否存在
    const product = await Database.get('SELECT * FROM products WHERE id = ?', [id]);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: '產品不存在'
      });
    }

    // 處理圖片 - 支持文件上傳和 URL
    let currentImages = [];

    // 保留現有圖片（包括文件路徑和 URL）
    if (existing_images) {
      const existingList = typeof existing_images === 'string'
        ? JSON.parse(existing_images)
        : existing_images;

      if (Array.isArray(existingList)) {
        currentImages = existingList;
        console.log('📸 保留現有圖片:', currentImages);
      }
    }

    // 添加新上傳的圖片文件
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => `products/${file.filename}`);
      currentImages = [...currentImages, ...newImages];
      console.log('📤 添加新上傳圖片:', newImages);
    }

    // 限制最多5張圖片
    currentImages = currentImages.slice(0, 5);
    console.log('🖼️ 最終圖片列表:', currentImages);

    // 處理多件優惠數據
    let parsedMultiDiscount = {};
    if (multi_discount) {
      try {
        parsedMultiDiscount = typeof multi_discount === 'string' 
          ? JSON.parse(multi_discount) 
          : multi_discount;
      } catch (e) {
        console.warn('多件優惠數據格式錯誤:', e);
      }
    }

    await Database.run(
      `UPDATE products
       SET name = ?, description = ?, price = ?, multi_discount = ?, images = ?
       WHERE id = ?`,
      [
        name || product.name,
        description !== undefined ? description : product.description,
        price ? parseFloat(price) : product.price,
        JSON.stringify(parsedMultiDiscount),
        JSON.stringify(currentImages),
        id
      ]
    );

    res.json({
      success: true,
      message: '產品更新成功'
    });
  } catch (error) {
    console.error('更新產品錯誤:', error);
    res.status(500).json({
      success: false,
      message: '更新產品失敗'
    });
  }
});

// 管理員：刪除產品
router.delete('/admin/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️  刪除產品請求，ID:', id);

    // 檢查產品是否存在
    const product = await Database.get('SELECT * FROM products WHERE id = ?', [id]);
    if (!product) {
      console.log('❌ 產品不存在，ID:', id);
      return res.status(404).json({
        success: false,
        message: '產品不存在'
      });
    }

    console.log('✅ 找到產品:', product.name);

    // 軟刪除（設為不活躍）- 暫時不使用 updated_at 字段
    const result = await Database.run(
      'UPDATE products SET is_active = 0 WHERE id = ?',
      [id]
    );

    console.log('📝 更新結果:', result);

    res.json({
      success: true,
      message: '產品刪除成功'
    });
  } catch (error) {
    console.error('❌ 刪除產品錯誤:', error);
    res.status(500).json({
      success: false,
      message: '刪除產品失敗: ' + error.message
    });
  }
});

// 管理員：恢復產品
router.put('/admin/:id/restore', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await Database.run(
      'UPDATE products SET is_active = 1 WHERE id = ?',
      [id]
    );

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: '產品不存在'
      });
    }

    res.json({
      success: true,
      message: '產品恢復成功'
    });
  } catch (error) {
    console.error('恢復產品錯誤:', error);
    res.status(500).json({
      success: false,
      message: '恢復產品失敗'
    });
  }
});

// 管理員：永久刪除產品
router.delete('/admin/:id/permanent', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️  永久刪除產品請求，ID:', id);

    // 檢查產品是否存在
    const product = await Database.get('SELECT * FROM products WHERE id = ?', [id]);
    if (!product) {
      console.log('❌ 產品不存在，ID:', id);
      return res.status(404).json({
        success: false,
        message: '產品不存在'
      });
    }

    console.log('✅ 找到產品:', product.name);

    // 開始事務
    await Database.beginTransaction();

    try {
      // 先刪除相關的規格
      await Database.run('DELETE FROM flavors WHERE product_id = ?', [id]);
      console.log('📝 已刪除相關規格');

      // 再刪除產品
      const result = await Database.run('DELETE FROM products WHERE id = ?', [id]);
      console.log('📝 刪除結果:', result);

      await Database.commit();

      res.json({
        success: true,
        message: '產品及相關規格已永久刪除'
      });
    } catch (error) {
      await Database.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ 永久刪除產品錯誤:', error);
    res.status(500).json({
      success: false,
      message: '永久刪除產品失敗: ' + error.message
    });
  }
});

module.exports = router;
