const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const Database = require('../config/database');
const { authenticateAdmin } = require('./auth');
const { uploadBufferToCloudinary, deleteFromCloudinary, extractPublicIdFromUrl } = require('../config/cloudinary');

const router = express.Router();

// 配置 multer 使用內存存儲（用於 Cloudinary 上傳）
const upload = multer({
  storage: multer.memoryStorage(),
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

// 配置專門用於TXT文件的multer
const txtUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    }
  }),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB for text files
    files: 1 // 只允許一個文件
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /txt|text/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = file.mimetype === 'text/plain' || file.mimetype === 'application/octet-stream';

    if (extname || mimetype) {
      cb(null, true);
    } else {
      cb(new Error('只允許上傳 TXT 格式的文本文件'));
    }
  }
});

// 獲取所有產品（前端用戶）
router.get('/', async (req, res) => {
  try {
    // 先檢查是否有 sort_order 字段
    let products;
    try {
      products = await Database.all(
        'SELECT id, name, description, price, category, multi_discount, images, is_active, sort_order FROM products WHERE is_active = true ORDER BY sort_order ASC, id ASC'
      );
    } catch (error) {
      if (error.message.includes('no such column: sort_order')) {
        console.log('⚠️  sort_order 字段不存在，使用默認排序');
        products = await Database.all(
          'SELECT id, name, description, price, category, multi_discount, images, is_active FROM products WHERE is_active = true ORDER BY id ASC'
        );
        // 為每個產品添加默認 sort_order
        products = products.map((product, index) => ({
          ...product,
          sort_order: index + 1
        }));
      } else {
        throw error;
      }
    }

    // 解析 JSON 字段並獲取規格數據
    const formattedProducts = await Promise.all(
      products.map(async (product) => {
        // 從 flavors 表獲取規格數據
        const flavors = await Database.all(`
          SELECT f.id, f.name, f.sort_order, f.stock, f.category_id,
                 fc.name as category_name
          FROM flavors f
          LEFT JOIN flavor_categories fc ON f.category_id = fc.id
          WHERE f.product_id = ? AND f.is_active = true
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
      'SELECT id, name, description, price, multi_discount, images, is_active, created_at FROM products WHERE id = ? AND is_active = true',
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
    // 先檢查是否有 sort_order 字段
    let products;
    try {
      products = await Database.all(
        'SELECT id, name, description, price, category, multi_discount, images, is_active, created_at, sort_order FROM products ORDER BY sort_order ASC, created_at DESC'
      );
    } catch (error) {
      if (error.message.includes('no such column: sort_order')) {
        console.log('⚠️  sort_order 字段不存在，使用默認排序');
        products = await Database.all(
          'SELECT id, name, description, price, category, multi_discount, images, is_active, created_at FROM products ORDER BY created_at DESC'
        );
        // 為每個產品添加默認 sort_order
        products = products.map((product, index) => ({
          ...product,
          sort_order: index + 1
        }));
      } else {
        throw error;
      }
    }

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
    const { name, description, price, category, multi_discount, existing_images } = req.body;

    console.log('🆕 創建產品請求');
    console.log('📝 請求數據:', { name, price, category, existing_images });
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

    // 處理圖片 - 支持文件上傳和 URL（使用 Cloudinary）
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

    // 處理上傳的圖片文件 - 上傳到 Cloudinary
    if (req.files && req.files.length > 0) {
      console.log('☁️ 開始上傳圖片到 Cloudinary...');
      const uploadPromises = req.files.map(async (file, index) => {
        try {
          console.log(`📤 上傳文件 ${index + 1}:`, file.originalname);
          const result = await uploadBufferToCloudinary(file.buffer, {
            folder: 'hazo/products',
            public_id: `product_${Date.now()}_${index}`
          });
          console.log(`✅ Cloudinary 上傳成功:`, result.secure_url);
          return result.secure_url;
        } catch (error) {
          console.error(`❌ Cloudinary 上傳失敗:`, error.message);
          throw error;
        }
      });

      try {
        const uploadedUrls = await Promise.all(uploadPromises);
        allImages = [...allImages, ...uploadedUrls];
        console.log('📤 新上傳圖片 URLs:', uploadedUrls);
      } catch (error) {
        return res.status(500).json({
          success: false,
          message: '圖片上傳失敗: ' + error.message
        });
      }
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

    // 獲取下一個排序順序
    const lastProduct = await Database.get('SELECT MAX(sort_order) as max_sort FROM products');
    const nextSortOrder = (lastProduct?.max_sort || 0) + 1;

    // 插入產品數據
    const result = await Database.run(
      'INSERT INTO products (name, description, price, category, multi_discount, images, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id',
      [
        name,
        description || '',
        price,
        category || '其他',
        JSON.stringify(parsedMultiDiscount),
        JSON.stringify(allImages),
        true,
        nextSortOrder
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

// 管理員：更新產品排序 (必須在 :id 路由之前)
router.put('/admin/update-sort-order', authenticateAdmin, async (req, res) => {
  try {
    const { products } = req.body;
    
    console.log('🔄 更新產品排序:', products);

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: '產品列表不能為空'
      });
    }


    // 開始事務
    await Database.beginTransaction();

    try {
      // 批量更新排序
      for (const product of products) {
        const { id, sort_order } = product;
        if (id && typeof sort_order === 'number') {
          await Database.run(
            'UPDATE products SET sort_order = ? WHERE id = ?',
            [sort_order, id]
          );
        }
      }

      await Database.commit();
      
      console.log('✅ 產品排序更新成功');

      res.json({
        success: true,
        message: '產品排序更新成功'
      });
    } catch (error) {
      await Database.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ 更新產品排序失敗:', error);
    res.status(500).json({
      success: false,
      message: '更新產品排序失敗: ' + error.message
    });
  }
});

// 管理員：更新產品
router.put('/admin/:id', authenticateAdmin, upload.array('images', 5), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, category, multi_discount, existing_images } = req.body;

    console.log('🔄 更新產品請求, ID:', id);
    console.log('📝 請求數據:', { name, price, category, existing_images });
    console.log('📁 上傳文件數量:', req.files?.length || 0);

    // 檢查產品是否存在
    const product = await Database.get('SELECT * FROM products WHERE id = ?', [id]);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: '產品不存在'
      });
    }

    // 處理圖片 - 支持文件上傳和 URL（使用 Cloudinary）
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

    // 添加新上傳的圖片文件 - 上傳到 Cloudinary
    if (req.files && req.files.length > 0) {
      console.log('☁️ 開始上傳新圖片到 Cloudinary...');
      const uploadPromises = req.files.map(async (file, index) => {
        try {
          console.log(`📤 上傳文件 ${index + 1}:`, file.originalname);
          const result = await uploadBufferToCloudinary(file.buffer, {
            folder: 'hazo/products',
            public_id: `product_${id}_${Date.now()}_${index}`
          });
          console.log(`✅ Cloudinary 上傳成功:`, result.secure_url);
          return result.secure_url;
        } catch (error) {
          console.error(`❌ Cloudinary 上傳失敗:`, error.message);
          throw error;
        }
      });

      try {
        const uploadedUrls = await Promise.all(uploadPromises);
        currentImages = [...currentImages, ...uploadedUrls];
        console.log('📤 添加新上傳圖片 URLs:', uploadedUrls);
      } catch (error) {
        return res.status(500).json({
          success: false,
          message: '圖片上傳失敗: ' + error.message
        });
      }
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

    const result = await Database.run(
      `UPDATE products 
       SET name = ?, description = ?, price = ?, category = ?, multi_discount = ?, images = ?
       WHERE id = ?`,
      [
        name,
        description || '',
        price,
        category || '其他',
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

    // 軟刪除（設為不活躍）
    const result = await Database.run(
      'UPDATE products SET is_active = false WHERE id = ?',
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
      'UPDATE products SET is_active = true WHERE id = ?',
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

      // 先刪除相關的規格
      await Database.run('DELETE FROM flavors WHERE product_id = ?', [id]);
      console.log('📝 已刪除相關規格');

      // 再刪除產品
      const result = await Database.run('DELETE FROM products WHERE id = ?', [id]);
      console.log('📝 刪除結果:', result);

      if (isPostgreSQL) {
        await Database.commit(client);
      } else {
        await Database.commit();
      }

      res.json({
        success: true,
        message: '產品及相關規格已永久刪除'
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
    console.error('❌ 永久刪除產品錯誤:', error);
    res.status(500).json({
      success: false,
      message: '永久刪除產品失敗: ' + error.message
    });
  }
});

// 批量導入產品 - txt文件
router.post('/admin/batch-import', authenticateAdmin, txtUpload.single('txtFile'), async (req, res) => {
  let tempFilePath = null;
  
  try {
    console.log('📤 批量導入產品請求:', {
      hasFile: !!req.file,
      fileName: req.file?.originalname,
      fileSize: req.file?.size
    });

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '請選擇要上傳的txt文件'
      });
    }

    tempFilePath = req.file.path;

    // 讀取文件內容
    const fileContent = await fs.promises.readFile(tempFilePath, 'utf-8');
    console.log('📄 文件內容長度:', fileContent.length);

    // 解析文件內容
    const parseResult = await parseProductsTxt(fileContent);
    console.log('📊 解析結果:', {
      總數量: parseResult.products.length,
      錯誤數量: parseResult.errors.length
    });

    if (parseResult.products.length === 0) {
      return res.status(400).json({
        success: false,
        message: '文件中沒有找到有效的產品數據',
        errors: parseResult.errors
      });
    }

    // 批量插入產品
    const insertResults = await batchInsertProducts(parseResult.products);
    
    // 清理臨時文件
    if (tempFilePath) {
      await fs.promises.unlink(tempFilePath).catch(console.error);
    }

    res.json({
      success: true,
      message: '批量導入產品完成',
      data: {
        totalProducts: parseResult.products.length,
        successful: insertResults.successful,
        failed: insertResults.failed,
        errors: [...parseResult.errors, ...insertResults.errors]
      }
    });

  } catch (error) {
    console.error('❌ 批量導入產品失敗:', error);
    
    // 清理臨時文件
    if (tempFilePath) {
      await fs.promises.unlink(tempFilePath).catch(console.error);
    }

    res.status(500).json({
      success: false,
      message: '批量導入產品失敗',
      error: error.message
    });
  }
});

// 解析txt文件內容
async function parseProductsTxt(content) {
  const products = [];
  const errors = [];
  
  try {
    // 按 "---" 分割產品
    const productBlocks = content.split(/---+/).map(block => block.trim()).filter(block => block);
    
    console.log(`📦 找到 ${productBlocks.length} 個產品`);

    for (let i = 0; i < productBlocks.length; i++) {
      const block = productBlocks[i];
      const lineNumber = i + 1;
      
      try {
        const product = parseProductBlock(block, lineNumber);
        if (product.valid) {
          products.push(product);
        }
      } catch (error) {
        errors.push(`產品 ${lineNumber}: ${error.message}`);
      }
    }

    return { products, errors };
  } catch (error) {
    console.error('❌ 解析txt文件失敗:', error);
    return { 
      products: [], 
      errors: [`文件解析錯誤: ${error.message}`] 
    };
  }
}

// 解析單個產品塊
function parseProductBlock(block, lineNumber) {
  const product = {
    valid: false,
    lineNumber,
    name: '',
    price: 0,
    stock: 0,
    category: '其他',
    description: '',
    multi_discount: {},
    is_active: true
  };

  const lines = block.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
  
  for (const line of lines) {
    if (line.includes('名稱：') || line.includes('名稱:')) {
      const colonIndex = line.indexOf('：') !== -1 ? line.indexOf('：') : line.indexOf(':');
      product.name = line.substring(colonIndex + 1).trim();
    } else if (line.includes('價格：') || line.includes('價格:')) {
      const colonIndex = line.indexOf('：') !== -1 ? line.indexOf('：') : line.indexOf(':');
      product.price = parseFloat(line.substring(colonIndex + 1).trim()) || 0;
    } else if (line.includes('庫存：') || line.includes('庫存:')) {
      const colonIndex = line.indexOf('：') !== -1 ? line.indexOf('：') : line.indexOf(':');
      product.stock = parseInt(line.substring(colonIndex + 1).trim()) || 0;
    } else if (line.includes('分類：') || line.includes('分類:')) {
      const colonIndex = line.indexOf('：') !== -1 ? line.indexOf('：') : line.indexOf(':');
      product.category = line.substring(colonIndex + 1).trim() || '其他';
    } else if (line.includes('描述：') || line.includes('描述:')) {
      const colonIndex = line.indexOf('：') !== -1 ? line.indexOf('：') : line.indexOf(':');
      product.description = line.substring(colonIndex + 1).trim();
    } else if (line.includes('多件優惠：') || line.includes('多件優惠:')) {
      const colonIndex = line.indexOf('：') !== -1 ? line.indexOf('：') : line.indexOf(':');
      try {
        product.multi_discount = JSON.parse(line.substring(colonIndex + 1).trim()) || {};
      } catch {
        product.multi_discount = {};
      }
    } else if (line.includes('是否啟用：') || line.includes('是否啟用:')) {
      const colonIndex = line.indexOf('：') !== -1 ? line.indexOf('：') : line.indexOf(':');
      const value = line.substring(colonIndex + 1).trim().toLowerCase();
      product.is_active = value === 'true' || value === '是' || value === '1';
    }
  }

  // 驗證必要字段
  if (!product.name) {
    throw new Error('產品名稱不能為空');
  }
  if (!product.price || product.price <= 0) {
    throw new Error('價格必須大於0');
  }

  product.valid = true;
  return product;
}

// 批量插入產品
async function batchInsertProducts(products) {
  const results = {
    successful: 0,
    failed: 0,
    errors: []
  };

  for (const product of products) {
    try {
      // 檢查是否已存在同名產品
      const existing = await Database.get('SELECT id FROM products WHERE name = ?', [product.name]);
      if (existing) {
        throw new Error(`產品 "${product.name}" 已存在`);
      }

      // 插入產品
      await Database.run(`
        INSERT INTO products (name, price, category, description, multi_discount, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        product.name,
        product.price,
        product.category,
        product.description,
        JSON.stringify(product.multi_discount),
        product.is_active ? true : false
      ]);

      console.log(`✅ 成功添加產品: ${product.name}`);
      results.successful++;

    } catch (error) {
      console.error(`❌ 處理產品 ${product.name} 失敗:`, error.message);
      results.failed++;
      results.errors.push(`${product.name}: ${error.message}`);
    }
  }

  return results;
}

// 獲取批量導入模板
router.get('/admin/batch-import/template', (req, res) => {
  const template = `# TXT產品批量導入模板
# 
# 格式說明:
# 1. 每個產品之間用 "---" 分隔
# 2. 每行格式: 字段名: 值 (冒號後要有空格)
# 3. 必填字段: 名稱、價格
# 4. 可選字段: 分類、描述、多件優惠、是否啟用
# 5. 文件編碼: UTF-8
# 6. 注意：庫存由規格管理，產品表不存儲庫存
#
# 可用分類: 其他
#
# 多件優惠格式: {"數量": 折扣係數}
# 例如: {"2": 0.9, "5": 0.8} 表示買2件9折，買5件8折
#
# ==================== 範例產品開始 ====================

名稱: OXVA NEXLIM 大蠻牛
價格: 300
庫存: 100
分類: 其他
描述: OXVA NeXLIM 是 OXVA 推出的最新一代電子煙設備，旨在為用戶提供卓越的體驗。主要特點包括強大的電池容量、雙網格技術、可調節功率範圍等功能。
多件優惠: {"2": 0.9, "5": 0.8, "10": 0.7}
是否啟用: true
---
名稱: OXVA XLIM PRO 2
價格: 250
庫存: 50
分類: 注油式主機與耗材
描述: 注油式主機，可重複使用，經濟實惠。配備高品質霧化器，提供優質的使用體驗。
多件優惠: {"3": 0.9}
是否啟用: true
---
名稱: 小煙油系列 - 蘋果味
價格: 150
庫存: 200
分類: 小煙油系列
描述: 清香的蘋果味煙油，口感順滑，回味甘甜。採用優質原料製作，安全可靠。
是否啟用: true
---
名稱: 拋棄式煙蛋 - 薄荷味
價格: 80
庫存: 300
分類: 拋棄式通用煙蛋系列
描述: 清涼薄荷味，即開即用，方便攜帶。一次性使用，衛生便利。
多件優惠: {"5": 0.85, "10": 0.75}
是否啟用: true
---
名稱: 電子煙配件套裝
價格: 120
庫存: 80
分類: 其他
描述: 包含充電線、清潔工具、備用零件等，是電子煙用戶的必備配件。
是否啟用: true
---`;

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="product_import_template.txt"');
  res.send(template);
});

// 根據分類獲取產品
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    console.log('🏷️ 根據分類獲取產品:', category);
    
    const products = await Database.all(
      'SELECT id, name, description, price, category, multi_discount, images, is_active FROM products WHERE is_active = true AND category = ? ORDER BY id',
      [category]
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
          WHERE f.product_id = ? AND f.is_active = true
          ORDER BY fc.sort_order, f.sort_order, f.id
        `, [product.id]);

        return {
          ...product,
          multi_discount: product.multi_discount ? JSON.parse(product.multi_discount) : {},
          images: product.images ? JSON.parse(product.images) : [],
          variants: flavors
        };
      })
    );

    res.json({
      success: true,
      data: formattedProducts,
      count: formattedProducts.length
    });
  } catch (error) {
    console.error('根據分類獲取產品錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取產品列表失敗'
    });
  }
});

// 獲取所有產品分類
router.get('/categories/list', async (req, res) => {
  try {
    const categories = await Database.all(
      'SELECT DISTINCT category FROM products WHERE is_active = true AND category IS NOT NULL ORDER BY category'
    );

    const categoryList = categories.map(row => row.category);
    
    // 確保所有標準分類都包含在內
    const standardCategories = [
      '其他'
    ];
    
    const allCategories = [...new Set([...standardCategories, ...categoryList])];

    res.json({
      success: true,
      data: allCategories
    });
  } catch (error) {
    console.error('獲取產品分類錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取產品分類失敗'
    });
  }
});

module.exports = router;
