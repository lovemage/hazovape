const express = require('express');
const router = express.Router();
const Database = require('../config/database');
const { authenticateAdmin } = require('./auth');

// 獲取所有產品分類（公開）
router.get('/', async (req, res) => {
  try {
    const categories = await Database.all(
      'SELECT id, name, description, sort_order FROM product_categories WHERE is_active = true ORDER BY sort_order, name'
    );

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('獲取產品分類失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取產品分類失敗'
    });
  }
});

// 管理員：獲取所有產品分類
router.get('/admin', authenticateAdmin, async (req, res) => {
  try {
    const categories = await Database.all(
      'SELECT * FROM product_categories ORDER BY sort_order, name'
    );

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('獲取產品分類失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取產品分類失敗'
    });
  }
});

// 管理員：創建產品分類
router.post('/admin', authenticateAdmin, async (req, res) => {
  try {
    const { name, description, sort_order } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: '分類名稱不能為空'
      });
    }

    // 檢查分類名稱是否已存在
    const existingCategory = await Database.get(
      'SELECT id FROM product_categories WHERE name = ?',
      [name]
    );

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: '分類名稱已存在'
      });
    }

    const result = await Database.run(
      'INSERT INTO product_categories (name, description, sort_order) VALUES (?, ?, ?) RETURNING id',
      [name, description || '', sort_order || 0]
    );

    const newCategory = await Database.get(
      'SELECT * FROM product_categories WHERE id = ?',
      [result.id]
    );

    res.json({
      success: true,
      data: newCategory,
      message: '產品分類創建成功'
    });
  } catch (error) {
    console.error('創建產品分類失敗:', error);
    res.status(500).json({
      success: false,
      message: '創建產品分類失敗'
    });
  }
});

// 管理員：更新產品分類
router.put('/admin/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, sort_order, is_active } = req.body;

    // 檢查分類是否存在
    const category = await Database.get(
      'SELECT * FROM product_categories WHERE id = ?',
      [id]
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: '分類不存在'
      });
    }

    // 檢查名稱是否與其他分類重複
    if (name && name !== category.name) {
      const existingCategory = await Database.get(
        'SELECT id FROM product_categories WHERE name = ? AND id != ?',
        [name, id]
      );

      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: '分類名稱已存在'
        });
      }
    }

    await Database.run(
      `UPDATE product_categories 
       SET name = ?, description = ?, sort_order = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        name || category.name,
        description !== undefined ? description : category.description,
        sort_order !== undefined ? sort_order : category.sort_order,
        is_active !== undefined ? is_active : category.is_active,
        id
      ]
    );

    const updatedCategory = await Database.get(
      'SELECT * FROM product_categories WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      data: updatedCategory,
      message: '產品分類更新成功'
    });
  } catch (error) {
    console.error('更新產品分類失敗:', error);
    res.status(500).json({
      success: false,
      message: '更新產品分類失敗'
    });
  }
});

// 管理員：刪除產品分類
router.delete('/admin/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // 檢查分類是否存在
    const category = await Database.get(
      'SELECT * FROM product_categories WHERE id = ?',
      [id]
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: '分類不存在'
      });
    }

    // 檢查是否有產品使用此分類
    const productsCount = await Database.get(
      'SELECT COUNT(*) as count FROM products WHERE category = ?',
      [category.name]
    );

    if (productsCount.count > 0) {
      return res.status(400).json({
        success: false,
        message: `無法刪除分類，還有 ${productsCount.count} 個產品使用此分類`
      });
    }

    await Database.run('DELETE FROM product_categories WHERE id = ?', [id]);

    res.json({
      success: true,
      message: '產品分類刪除成功'
    });
  } catch (error) {
    console.error('刪除產品分類失敗:', error);
    res.status(500).json({
      success: false,
      message: '刪除產品分類失敗'
    });
  }
});

module.exports = router; 