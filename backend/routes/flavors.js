const express = require('express');
const Database = require('../config/database');
const { authenticateAdmin } = require('./auth');

const router = express.Router();

// 獲取所有活躍口味（前端用戶）- 按商品分組
router.get('/', async (req, res) => {
  try {
    const flavors = await Database.all(`
      SELECT f.id, f.name, f.sort_order, f.stock, f.product_id, f.category_id,
             p.name as product_name,
             fc.name as category_name
      FROM flavors f
      LEFT JOIN products p ON f.product_id = p.id
      LEFT JOIN flavor_categories fc ON f.category_id = fc.id
      WHERE f.is_active = 1 AND p.is_active = 1
      ORDER BY p.name, fc.sort_order, f.sort_order, f.id
    `);

    res.json({
      success: true,
      data: flavors
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

    // 統一使用 flavors 表
    const flavors = await Database.all(`
      SELECT f.id, f.name, f.sort_order, f.stock, f.category_id,
             fc.name as category_name
      FROM flavors f
      LEFT JOIN flavor_categories fc ON f.category_id = fc.id
      WHERE f.product_id = ? AND f.is_active = 1
      ORDER BY fc.sort_order, f.sort_order, f.id
    `, [productId]);

    res.json({
      success: true,
      data: flavors
    });
  } catch (error) {
    console.error('獲取商品口味錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取商品口味失敗'
    });
  }
});

// 管理員：獲取所有口味（包括停用的）
router.get('/admin/all', authenticateAdmin, async (req, res) => {
  try {
    const flavors = await Database.all(`
      SELECT f.*, p.name as product_name, fc.name as category_name
      FROM flavors f
      LEFT JOIN products p ON f.product_id = p.id
      LEFT JOIN flavor_categories fc ON f.category_id = fc.id
      ORDER BY p.name, fc.sort_order, f.sort_order, f.created_at DESC
    `);

    res.json({
      success: true,
      data: flavors
    });
  } catch (error) {
    console.error('獲取口味列表錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取口味列表失敗'
    });
  }
});

// 管理員：創建口味
router.post('/admin', authenticateAdmin, async (req, res) => {
  try {
    console.log('🔄 創建規格請求:', req.body);
    const { name, product_id, category_id, sort_order, stock } = req.body;

    if (!name) {
      console.log('❌ 規格名稱為空');
      return res.status(400).json({
        success: false,
        message: '口味名稱不能為空'
      });
    }

    if (!product_id) {
      console.log('❌ 商品ID為空');
      return res.status(400).json({
        success: false,
        message: '請選擇商品'
      });
    }

    // 確保有默認類別，如果沒有就創建一個
    let finalCategoryId = category_id;
    if (!finalCategoryId) {
      console.log('🔍 檢查默認類別是否存在...');
      const defaultCategory = await Database.get(
        'SELECT id FROM flavor_categories WHERE id = 12'
      );

      if (!defaultCategory) {
        console.log('⚠️  默認類別不存在，創建默認類別...');
        try {
          await Database.run(
            'INSERT INTO flavor_categories (id, name, description, sort_order, is_active) VALUES (?, ?, ?, ?, ?)',
            [12, '其他系列', '其他特殊口味', 12, 1]
          );
          console.log('✅ 創建默認類別成功');
        } catch (error) {
          console.error('❌ 創建默認類別失敗:', error);
        }
      }
      finalCategoryId = 12;
    }

    // 檢查商品是否存在
    console.log('🔍 檢查商品是否存在:', product_id);
    const product = await Database.get(
      'SELECT id, name FROM products WHERE id = ?',
      [product_id]
    );

    if (!product) {
      console.log('❌ 商品不存在:', product_id);
      // 列出所有可用商品
      const allProducts = await Database.all('SELECT id, name FROM products');
      console.log('📋 可用商品列表:', allProducts);
      return res.status(400).json({
        success: false,
        message: `選擇的商品不存在 (ID: ${product_id})`
      });
    }
    console.log('✅ 商品存在:', product);

    // 檢查類別是否存在
    console.log('🔍 檢查類別是否存在:', finalCategoryId);
    const category = await Database.get(
      'SELECT id, name FROM flavor_categories WHERE id = ?',
      [finalCategoryId]
    );

    if (!category) {
      console.log('❌ 類別不存在:', finalCategoryId);
      // 列出所有可用類別
      const allCategories = await Database.all('SELECT id, name FROM flavor_categories');
      console.log('📋 可用類別列表:', allCategories);

      // 如果沒有任何類別，創建一個默認類別
      if (allCategories.length === 0) {
        console.log('⚠️  沒有任何類別，創建默認類別...');
        try {
          await Database.run(
            'INSERT INTO flavor_categories (id, name, description, sort_order, is_active) VALUES (?, ?, ?, ?, ?)',
            [1, '默認類別', '默認規格類別', 1, 1]
          );
          finalCategoryId = 1;
          console.log('✅ 創建默認類別成功');
        } catch (error) {
          console.error('❌ 創建默認類別失敗:', error);
          return res.status(500).json({
            success: false,
            message: '無法創建默認類別'
          });
        }
      } else {
        // 使用第一個可用類別
        finalCategoryId = allCategories[0].id;
        console.log('🔄 使用第一個可用類別:', allCategories[0]);
      }
    } else {
      console.log('✅ 類別存在:', category);
    }

    // 檢查同一商品下口味名稱是否已存在
    console.log('🔍 檢查規格名稱是否重複:', { name, product_id });
    const existingFlavor = await Database.get(
      'SELECT id FROM flavors WHERE name = ? AND product_id = ?',
      [name, product_id]
    );

    if (existingFlavor) {
      console.log('❌ 規格名稱已存在:', existingFlavor);
      return res.status(400).json({
        success: false,
        message: '該商品下已存在相同名稱的口味'
      });
    }

    // 最終驗證外鍵
    console.log('🔍 最終驗證外鍵...');
    const finalProduct = await Database.get('SELECT id FROM products WHERE id = ?', [parseInt(product_id)]);
    const finalCategory = await Database.get('SELECT id FROM flavor_categories WHERE id = ?', [parseInt(finalCategoryId)]);

    if (!finalProduct) {
      console.log('❌ 最終驗證：商品不存在');
      return res.status(400).json({
        success: false,
        message: '商品驗證失敗'
      });
    }

    if (!finalCategory) {
      console.log('❌ 最終驗證：類別不存在');
      return res.status(400).json({
        success: false,
        message: '類別驗證失敗'
      });
    }

    const insertData = {
      name,
      product_id: parseInt(product_id),
      category_id: parseInt(finalCategoryId),
      sort_order: parseInt(sort_order) || 0,
      stock: parseInt(stock) || 0,
      is_active: 1
    };

    console.log('🔄 創建規格:', insertData);

    const result = await Database.run(
      'INSERT INTO flavors (name, product_id, category_id, sort_order, stock, is_active) VALUES (?, ?, ?, ?, ?, ?)',
      [insertData.name, insertData.product_id, insertData.category_id, insertData.sort_order, insertData.stock, insertData.is_active]
    );

    console.log('✅ 規格創建成功:', result.lastID);
    res.json({
      success: true,
      message: '口味創建成功',
      data: { id: result.lastID }
    });
  } catch (error) {
    console.error('❌ 創建口味錯誤:', error);
    console.error('錯誤堆棧:', error.stack);
    res.status(500).json({
      success: false,
      message: '創建口味失敗: ' + error.message
    });
  }
});

// 管理員：更新口味
router.put('/admin/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, product_id, category_id, sort_order, is_active, stock } = req.body;

    // 檢查口味是否存在
    const flavor = await Database.get('SELECT * FROM flavors WHERE id = ?', [id]);
    if (!flavor) {
      return res.status(404).json({
        success: false,
        message: '口味不存在'
      });
    }

    // 如果更新商品，檢查商品是否存在
    if (product_id && product_id !== flavor.product_id) {
      const product = await Database.get(
        'SELECT id FROM products WHERE id = ? AND is_active = 1',
        [product_id]
      );

      if (!product) {
        return res.status(400).json({
          success: false,
          message: '選擇的商品不存在或已停用'
        });
      }
    }

    // 如果更新類別，檢查類別是否存在
    if (category_id && category_id !== flavor.category_id) {
      const category = await Database.get(
        'SELECT id FROM flavor_categories WHERE id = ? AND is_active = 1',
        [category_id]
      );

      if (!category) {
        return res.status(400).json({
          success: false,
          message: '選擇的類別不存在或已停用'
        });
      }
    }

    // 如果更新名稱或商品，檢查同一商品下是否重複
    if ((name && name !== flavor.name) || (product_id && product_id !== flavor.product_id)) {
      const checkProductId = product_id || flavor.product_id;
      const checkName = name || flavor.name;

      const existingFlavor = await Database.get(
        'SELECT id FROM flavors WHERE name = ? AND product_id = ? AND id != ?',
        [checkName, checkProductId, id]
      );

      if (existingFlavor) {
        return res.status(400).json({
          success: false,
          message: '該商品下已存在相同名稱的口味'
        });
      }
    }

    await Database.run(
      `UPDATE flavors
       SET name = ?, product_id = ?, category_id = ?, sort_order = ?, is_active = ?, stock = ?
       WHERE id = ?`,
      [
        name || flavor.name,
        product_id !== undefined ? parseInt(product_id) : flavor.product_id,
        category_id !== undefined ? parseInt(category_id) : flavor.category_id,
        sort_order !== undefined ? parseInt(sort_order) : flavor.sort_order,
        is_active !== undefined ? is_active : flavor.is_active,
        stock !== undefined ? parseInt(stock) : flavor.stock,
        id
      ]
    );

    res.json({
      success: true,
      message: '口味更新成功'
    });
  } catch (error) {
    console.error('更新口味錯誤:', error);
    res.status(500).json({
      success: false,
      message: '更新口味失敗'
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
