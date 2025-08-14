const express = require('express');
const router = express.Router();
const Database = require('../config/database');
const { authenticateAdmin } = require('./auth');

// 獲取所有類別（用戶端）
router.get('/', async (req, res) => {
  try {
    const categories = await Database.all(
      'SELECT id, name, description, sort_order FROM flavor_categories WHERE is_active = true ORDER BY sort_order, id'
    );

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('獲取類別失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取類別失敗'
    });
  }
});

// 獲取所有類別（管理員）
router.get('/admin/all', authenticateAdmin, async (req, res) => {
  try {
    const categories = await Database.all(
      'SELECT * FROM flavor_categories ORDER BY sort_order, id'
    );

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('獲取類別失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取類別失敗'
    });
  }
});

// 創建類別
router.post('/admin', authenticateAdmin, async (req, res) => {
  try {
    const { name, description, sort_order } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: '類別名稱不能為空'
      });
    }

    // 檢查名稱是否已存在
    const existingCategory = await Database.get(
      'SELECT id FROM flavor_categories WHERE name = ?',
      [name]
    );

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: '類別名稱已存在'
      });
    }

    const result = await Database.run(
      'INSERT INTO flavor_categories (name, description, sort_order) VALUES (?, ?, ?) RETURNING id',
      [name, description || '', parseInt(sort_order) || 0]
    );

    res.json({
      success: true,
      message: '類別創建成功',
      data: { id: result.id }
    });

  } catch (error) {
    console.error('創建類別失敗:', error);
    res.status(500).json({
      success: false,
      message: '創建類別失敗'
    });
  }
});

// 更新類別
router.put('/admin/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, sort_order, is_active } = req.body;

    // 檢查類別是否存在
    const category = await Database.get(
      'SELECT * FROM flavor_categories WHERE id = ?',
      [id]
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: '類別不存在'
      });
    }

    // 如果更新名稱，檢查是否與其他類別重複
    if (name && name !== category.name) {
      const existingCategory = await Database.get(
        'SELECT id FROM flavor_categories WHERE name = ? AND id != ?',
        [name, id]
      );

      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: '類別名稱已存在'
        });
      }
    }

    await Database.run(
      `UPDATE flavor_categories 
       SET name = ?, description = ?, sort_order = ?, is_active = ?
       WHERE id = ?`,
      [
        name || category.name,
        description !== undefined ? description : category.description,
        sort_order !== undefined ? parseInt(sort_order) : category.sort_order,
        is_active !== undefined ? is_active : category.is_active,
        id
      ]
    );

    res.json({
      success: true,
      message: '類別更新成功'
    });

  } catch (error) {
    console.error('更新類別失敗:', error);
    res.status(500).json({
      success: false,
      message: '更新類別失敗'
    });
  }
});

// 停用類別
router.delete('/admin/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // 檢查是否有口味使用此類別
    const flavorsCount = await Database.get(
      'SELECT COUNT(*) as count FROM flavors WHERE category_id = ? AND is_active = true',
      [id]
    );

    if (flavorsCount.count > 0) {
      return res.status(400).json({
        success: false,
        message: `無法停用類別，還有 ${flavorsCount.count} 個口味正在使用此類別`
      });
    }

    await Database.run(
      'UPDATE flavor_categories SET is_active = false WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: '類別已停用'
    });

  } catch (error) {
    console.error('停用類別失敗:', error);
    res.status(500).json({
      success: false,
      message: '停用類別失敗'
    });
  }
});

// 啟用類別
router.put('/admin/:id/restore', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await Database.run(
      'UPDATE flavor_categories SET is_active = true WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: '類別已啟用'
    });

  } catch (error) {
    console.error('啟用類別失敗:', error);
    res.status(500).json({
      success: false,
      message: '啟用類別失敗'
    });
  }
});

module.exports = router;
