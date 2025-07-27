const express = require('express');
const Database = require('../config/database');
const { authenticateAdmin } = require('./auth');
const multer = require('multer');
const fs = require('fs').promises;

const router = express.Router();

// 設置文件上傳（用於批量導入）
const upload = multer({
  dest: 'uploads/temp/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/plain' || file.originalname.endsWith('.txt')) {
      cb(null, true);
    } else {
      cb(new Error('只允許上傳 txt 文件'), false);
    }
  }
});

// 批量導入規格 - txt文件
router.post('/admin/batch-import', authenticateAdmin, upload.single('txtFile'), async (req, res) => {
  let tempFilePath = null;
  
  try {
    console.log('📤 批量導入規格請求:', {
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
    const fileContent = await fs.readFile(tempFilePath, 'utf-8');
    console.log('📄 文件內容長度:', fileContent.length);

    // 解析文件內容
    const parseResult = await parseFlavorsTxt(fileContent);
    console.log('📊 解析結果:', {
      總數量: parseResult.groups.length,
      錯誤數量: parseResult.errors.length
    });

    if (parseResult.groups.length === 0) {
      return res.status(400).json({
        success: false,
        message: '文件中沒有找到有效的規格數據',
        errors: parseResult.errors
      });
    }

    // 批量插入規格
    const insertResults = await batchInsertFlavors(parseResult.groups);
    
    // 清理臨時文件
    if (tempFilePath) {
      await fs.unlink(tempFilePath).catch(console.error);
    }

    res.json({
      success: true,
      message: '批量導入規格完成',
      data: {
        totalGroups: parseResult.groups.length,
        successful: insertResults.successful,
        failed: insertResults.failed,
        totalFlavors: insertResults.totalFlavors,
        errors: [...parseResult.errors, ...insertResults.errors]
      }
    });

  } catch (error) {
    console.error('❌ 批量導入規格失敗:', error);
    
    // 清理臨時文件
    if (tempFilePath) {
      await fs.unlink(tempFilePath).catch(console.error);
    }

    res.status(500).json({
      success: false,
      message: '批量導入規格失敗',
      error: error.message
    });
  }
});

// 解析txt文件內容
async function parseFlavorsTxt(content) {
  const groups = [];
  const errors = [];
  
  try {
    // 按 "---" 或空行分割產品組
    const productBlocks = content.split(/---+|(?:\r?\n){2,}/).map(block => block.trim()).filter(block => block);
    
    console.log(`📦 找到 ${productBlocks.length} 個產品規格組`);

    for (let i = 0; i < productBlocks.length; i++) {
      const block = productBlocks[i];
      const lineNumber = i + 1;
      
      try {
        const group = parseFlavorGroup(block, lineNumber);
        if (group.flavors.length > 0) {
          groups.push(group);
        }
      } catch (error) {
        errors.push(`產品組 ${lineNumber}: ${error.message}`);
      }
    }

    return { groups, errors };
  } catch (error) {
    console.error('❌ 解析txt文件失敗:', error);
    return { 
      groups: [], 
      errors: [`文件解析錯誤: ${error.message}`] 
    };
  }
}

// 解析單個產品規格組
function parseFlavorGroup(block, lineNumber) {
  const group = {
    valid: false,
    lineNumber,
    productName: '',
    productId: null,
    category: '規格',
    flavors: []
  };

  const lines = block.split('\n').map(line => line.trim()).filter(line => line);
  
  let inFlavorList = false;
  
  for (const line of lines) {
    // 檢查是否是產品名稱行
    if (line.includes('產品名稱：') || line.includes('產品名稱:') || line.includes('商品名稱：') || line.includes('商品名稱:')) {
      const colonIndex = line.indexOf('：') !== -1 ? line.indexOf('：') : line.indexOf(':');
      group.productName = line.substring(colonIndex + 1).trim();
      continue;
    }
    
    // 檢查是否是規格開始行
    if (line.includes('規格：') || line.includes('規格:') || line.includes('口味：') || line.includes('口味:')) {
      inFlavorList = true;
      // 如果這行還有規格名稱，也要處理
      const colonIndex = line.indexOf('：') !== -1 ? line.indexOf('：') : line.indexOf(':');
      const afterColon = line.substring(colonIndex + 1).trim();
      if (afterColon) {
        group.flavors.push(afterColon);
      }
      continue;
    }
    
    // 檢查是否是分類行
    if (line.includes('分類：') || line.includes('分類:')) {
      const colonIndex = line.indexOf('：') !== -1 ? line.indexOf('：') : line.indexOf(':');
      group.category = line.substring(colonIndex + 1).trim() || '規格';
      continue;
    }
    
    // 如果在規格列表中，每行都是一個規格
    if (inFlavorList && line && !line.includes('：') && !line.includes(':')) {
      group.flavors.push(line);
    }
  }

  // 驗證必要字段
  if (!group.productName) {
    throw new Error('產品名稱不能為空');
  }
  if (group.flavors.length === 0) {
    throw new Error('至少需要一個規格');
  }

  group.valid = true;
  return group;
}

// 批量插入規格
async function batchInsertFlavors(groups) {
  const results = {
    successful: 0,
    failed: 0,
    totalFlavors: 0,
    errors: []
  };

  // 獲取預設規格分類ID
  const defaultCategory = await Database.get('SELECT id FROM flavor_categories WHERE name = ? OR name = ?', ['規格', '默認']);
  const defaultCategoryId = defaultCategory?.id || 1;

  for (const group of groups) {
    try {
      // 查找產品
      const product = await Database.get('SELECT id FROM products WHERE name = ?', [group.productName]);
      if (!product) {
        throw new Error(`產品 "${group.productName}" 不存在`);
      }

      let insertedCount = 0;
      for (let i = 0; i < group.flavors.length; i++) {
        const flavorName = group.flavors[i];
        
        // 檢查是否已存在同名規格
        const existing = await Database.get(
          'SELECT id FROM flavors WHERE product_id = ? AND name = ?', 
          [product.id, flavorName]
        );
        
        if (existing) {
          console.log(`⚠️ 跳過重複規格: ${group.productName} - ${flavorName}`);
          continue;
        }

        // 插入規格
        await Database.run(`
          INSERT INTO flavors (name, product_id, category_id, stock, is_active, sort_order, created_at)
          VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        `, [
          flavorName,
          product.id,
          defaultCategoryId,
          999, // 預設庫存
          1,   // 啟用
          i + 1 // 排序
        ]);

        insertedCount++;
        results.totalFlavors++;
      }

      console.log(`✅ 成功為產品 ${group.productName} 添加 ${insertedCount} 個規格`);
      results.successful++;

    } catch (error) {
      console.error(`❌ 處理產品 ${group.productName} 失敗:`, error.message);
      results.failed++;
      results.errors.push(`${group.productName}: ${error.message}`);
    }
  }

  return results;
}

// 獲取批量導入模板
router.get('/admin/batch-import/template', (req, res) => {
  const template = `# 規格批量導入模板
# 
# 格式說明:
# 1. 每個產品組用 "---" 分隔或空行分隔
# 2. 產品名稱: 必須是系統中已存在的產品名稱
# 3. 規格: 每行一個規格名稱
# 4. 分類: 可選，預設為"規格"
#
# ==================== 範例開始 ====================

產品名稱: OXVA NEXLIM 大蠻牛
規格:
西瓜
蘋果
葡萄
榴蓮
芒果
藍莓
薄荷
---

產品名稱: OXVA XLIM PRO 2  
分類: 煙油口味
規格:
香草
巧克力
咖啡
抹茶
草莓
橙子
---

產品名稱: 小煙油系列 - 蘋果味
規格:
10ml
30ml
50ml
100ml
---`;

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="flavor_import_template.txt"');
  res.send(template);
});

// 獲取所有活躍口味（前端用戶）- 按商品分組
router.get('/', async (req, res) => {
  try {
    const flavors = await Database.all(`
      SELECT f.id, f.name, f.sort_order, f.stock, f.product_id, f.category_id, f.price,
             p.name as product_name, p.price as product_base_price,
             fc.name as category_name
      FROM flavors f
      LEFT JOIN products p ON f.product_id = p.id
      LEFT JOIN flavor_categories fc ON f.category_id = fc.id
      WHERE f.is_active = 1 AND p.is_active = 1
      ORDER BY p.name, fc.sort_order, f.sort_order, f.id
    `);

    // 計算最終價格（規格價格優先，否則使用產品基礎價格）
    const flavorsWithPrice = flavors.map(flavor => ({
      ...flavor,
      final_price: flavor.price !== null ? flavor.price : flavor.product_base_price
    }));

    res.json({
      success: true,
      data: flavorsWithPrice
    });
  } catch (error) {
    console.error('獲取口味列表錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取口味列表失敗'
    });
  }
});

// 獲取特定商品的口味
router.get('/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;

    // 統一使用 flavors 表，包含價格信息
    const flavors = await Database.all(`
      SELECT f.id, f.name, f.sort_order, f.stock, f.category_id, f.price,
             fc.name as category_name,
             p.price as product_base_price
      FROM flavors f
      LEFT JOIN flavor_categories fc ON f.category_id = fc.id
      LEFT JOIN products p ON f.product_id = p.id
      WHERE f.product_id = ? AND f.is_active = 1
      ORDER BY fc.sort_order, f.sort_order, f.id
    `, [productId]);

    // 計算最終價格（規格價格優先，否則使用產品基礎價格）
    const flavorsWithPrice = flavors.map(flavor => ({
      ...flavor,
      final_price: flavor.price !== null ? flavor.price : flavor.product_base_price
    }));

    res.json({
      success: true,
      data: flavorsWithPrice
    });
  } catch (error) {
    console.error('獲取商品口味錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取商品口味失敗'
    });
  }
});

// 獲取所有規格（管理員）
router.get('/admin/all', authenticateAdmin, async (req, res) => {
  try {
    const flavors = await Database.all(`
      SELECT f.id, f.name, f.product_id, f.category_id, f.stock, f.sort_order, 
             f.is_active, f.created_at, f.price,
             p.name as product_name, p.price as product_base_price,
             fc.name as category_name,
             CASE WHEN f.price IS NOT NULL THEN f.price ELSE p.price END as final_price
      FROM flavors f
      LEFT JOIN products p ON f.product_id = p.id
      LEFT JOIN flavor_categories fc ON f.category_id = fc.id
      ORDER BY p.name, fc.sort_order, f.sort_order, f.id
    `);

    res.json({
      success: true,
      data: flavors
    });
  } catch (error) {
    console.error('獲取規格列表錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取規格列表失敗'
    });
  }
});

// 創建新規格（管理員）
router.post('/admin', authenticateAdmin, async (req, res) => {
  try {
    const { name, product_id, category_id, stock, sort_order, price } = req.body;

    console.log('📝 創建規格請求:', { name, product_id, category_id, stock, sort_order, price });

    // 驗證必要字段
    if (!name || !product_id) {
      return res.status(400).json({
        success: false,
        message: '規格名稱和商品ID為必填項'
      });
    }

    // 驗證產品是否存在
    const product = await Database.get('SELECT id, name, price FROM products WHERE id = ?', [product_id]);
    if (!product) {
      return res.status(400).json({
        success: false,
        message: '指定的商品不存在'
      });
    }

    // 檢查同一商品下是否已有相同名稱的規格
    const existing = await Database.get(
      'SELECT id FROM flavors WHERE product_id = ? AND name = ?',
      [product_id, name]
    );

    if (existing) {
      return res.status(400).json({
        success: false,
        message: '該商品已存在相同名稱的規格'
      });
    }

    // 處理價格：如果沒有設定規格價格，則為NULL（使用產品基礎價格）
    const flavorPrice = price && price > 0 ? parseFloat(price) : null;

    // 插入新規格
    const result = await Database.run(`
      INSERT INTO flavors (name, product_id, category_id, stock, sort_order, price, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'))
    `, [
      name,
      product_id,
      category_id || 1,
      parseInt(stock) || 0,
      parseInt(sort_order) || 0,
      flavorPrice
    ]);

    console.log('✅ 規格創建成功:', result.lastID);

    // 返回創建的規格信息
    const newFlavor = await Database.get(`
      SELECT f.*, fc.name as category_name, p.price as product_base_price,
             CASE WHEN f.price IS NOT NULL THEN f.price ELSE p.price END as final_price
      FROM flavors f
      LEFT JOIN flavor_categories fc ON f.category_id = fc.id
      LEFT JOIN products p ON f.product_id = p.id
      WHERE f.id = ?
    `, [result.lastID]);

    res.json({
      success: true,
      message: '規格創建成功',
      data: newFlavor
    });

  } catch (error) {
    console.error('創建規格錯誤:', error);
    res.status(500).json({
      success: false,
      message: '創建規格失敗: ' + error.message
    });
  }
});

// 更新規格（管理員）
router.put('/admin/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category_id, stock, sort_order, is_active, price } = req.body;

    console.log('📝 更新規格請求:', { id, name, category_id, stock, sort_order, is_active, price });

    // 檢查規格是否存在
    const flavor = await Database.get('SELECT * FROM flavors WHERE id = ?', [id]);
    if (!flavor) {
      return res.status(404).json({
        success: false,
        message: '規格不存在'
      });
    }

    // 如果要更新名稱，檢查同一商品下是否已有相同名稱的其他規格
    if (name && name !== flavor.name) {
      const existing = await Database.get(
        'SELECT id FROM flavors WHERE product_id = ? AND name = ? AND id != ?',
        [flavor.product_id, name, id]
      );

      if (existing) {
        return res.status(400).json({
          success: false,
          message: '該商品已存在相同名稱的規格'
        });
      }
    }

    // 處理價格：如果設為0或空，則設為NULL（使用產品基礎價格）
    const flavorPrice = price && price > 0 ? parseFloat(price) : null;

    // 更新規格
    await Database.run(`
      UPDATE flavors 
      SET name = COALESCE(?, name),
          category_id = COALESCE(?, category_id),
          stock = COALESCE(?, stock),
          sort_order = COALESCE(?, sort_order),
          is_active = COALESCE(?, is_active),
          price = ?
      WHERE id = ?
    `, [
      name,
      category_id,
      stock !== undefined ? parseInt(stock) : undefined,
      sort_order !== undefined ? parseInt(sort_order) : undefined,
      is_active !== undefined ? (is_active ? 1 : 0) : undefined,
      flavorPrice,
      id
    ]);

    console.log('✅ 規格更新成功:', id);

    // 返回更新後的規格信息
    const updatedFlavor = await Database.get(`
      SELECT f.*, fc.name as category_name, p.price as product_base_price,
             CASE WHEN f.price IS NOT NULL THEN f.price ELSE p.price END as final_price
      FROM flavors f
      LEFT JOIN flavor_categories fc ON f.category_id = fc.id
      LEFT JOIN products p ON f.product_id = p.id
      WHERE f.id = ?
    `, [id]);

    res.json({
      success: true,
      message: '規格更新成功',
      data: updatedFlavor
    });

  } catch (error) {
    console.error('更新規格錯誤:', error);
    res.status(500).json({
      success: false,
      message: '更新規格失敗: ' + error.message
    });
  }
});

// 管理員：刪除規格
router.delete('/admin/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️  刪除規格請求，ID:', id);

    // 檢查規格是否存在
    const flavor = await Database.get('SELECT * FROM flavors WHERE id = ?', [id]);
    if (!flavor) {
      console.log('❌ 規格不存在，ID:', id);
      return res.status(404).json({
        success: false,
        message: '規格不存在'
      });
    }

    console.log('✅ 找到規格:', flavor.name);

    // 軟刪除（設為不活躍）- 暫時不使用 updated_at 字段
    const result = await Database.run(
      'UPDATE flavors SET is_active = 0 WHERE id = ?',
      [id]
    );

    console.log('📝 更新結果:', result);

    res.json({
      success: true,
      message: '規格刪除成功'
    });
  } catch (error) {
    console.error('❌ 刪除規格錯誤:', error);
    res.status(500).json({
      success: false,
      message: '刪除規格失敗: ' + error.message
    });
  }
});

// 管理員：恢復規格
router.put('/admin/:id/restore', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await Database.run(
      'UPDATE flavors SET is_active = 1 WHERE id = ?',
      [id]
    );

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: '規格不存在'
      });
    }

    res.json({
      success: true,
      message: '規格恢復成功'
    });
  } catch (error) {
    console.error('恢復規格錯誤:', error);
    res.status(500).json({
      success: false,
      message: '恢復規格失敗'
    });
  }
});

// 管理員：永久刪除規格
router.delete('/admin/:id/permanent', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️  永久刪除規格請求，ID:', id);

    // 檢查規格是否存在
    const flavor = await Database.get('SELECT * FROM flavors WHERE id = ?', [id]);
    if (!flavor) {
      console.log('❌ 規格不存在，ID:', id);
      return res.status(404).json({
        success: false,
        message: '規格不存在'
      });
    }

    console.log('✅ 找到規格:', flavor.name);

    // 永久刪除（從數據庫中移除）
    const result = await Database.run(
      'DELETE FROM flavors WHERE id = ?',
      [id]
    );

    console.log('📝 刪除結果:', result);

    res.json({
      success: true,
      message: '規格已永久刪除'
    });
  } catch (error) {
    console.error('❌ 永久刪除規格錯誤:', error);
    res.status(500).json({
      success: false,
      message: '永久刪除規格失敗: ' + error.message
    });
  }
});

// 管理員：批量更新排序
router.put('/admin/batch-sort', authenticateAdmin, async (req, res) => {
  try {
    const { flavors } = req.body;

    if (!Array.isArray(flavors)) {
      return res.status(400).json({
        success: false,
        message: '數據格式錯誤'
      });
    }

    // 開始事務
    await Database.beginTransaction();

    try {
      for (const flavor of flavors) {
        await Database.run(
          'UPDATE flavors SET sort_order = ? WHERE id = ?',
          [flavor.sort_order, flavor.id]
        );
      }

      await Database.commit();

      res.json({
        success: true,
        message: '排序更新成功'
      });
    } catch (error) {
      await Database.rollback();
      throw error;
    }
  } catch (error) {
    console.error('批量更新排序錯誤:', error);
    res.status(500).json({
      success: false,
      message: '排序更新失敗'
    });
  }
});

module.exports = router;
