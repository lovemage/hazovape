const express = require('express');
const Database = require('../config/database');
const { authenticateAdmin } = require('./auth');

const router = express.Router();

// 獲取活躍公告（前端用戶）
router.get('/', async (req, res) => {
  try {
    const announcements = await Database.all(
      'SELECT id, title, content, priority FROM announcements WHERE is_active = 1 ORDER BY priority DESC, created_at DESC'
    );

    res.json({
      success: true,
      data: announcements
    });
  } catch (error) {
    console.error('獲取公告列表錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取公告列表失敗'
    });
  }
});

// 管理員：獲取所有公告（包括停用的）
router.get('/admin/all', authenticateAdmin, async (req, res) => {
  try {
    const announcements = await Database.all(
      'SELECT * FROM announcements ORDER BY priority DESC, created_at DESC'
    );

    res.json({
      success: true,
      data: announcements
    });
  } catch (error) {
    console.error('獲取公告列表錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取公告列表失敗'
    });
  }
});

// 管理員：創建公告
router.post('/admin', authenticateAdmin, async (req, res) => {
  try {
    const { title, content, priority } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: '公告標題和內容不能為空'
      });
    }

    const result = await Database.run(
      'INSERT INTO announcements (title, content, priority) VALUES (?, ?, ?)',
      [title, content, parseInt(priority) || 0]
    );

    res.json({
      success: true,
      message: '公告創建成功',
      data: { id: result.id }
    });
  } catch (error) {
    console.error('創建公告錯誤:', error);
    res.status(500).json({
      success: false,
      message: '創建公告失敗'
    });
  }
});

// 管理員：更新公告
router.put('/admin/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, priority, is_active } = req.body;

    // 檢查公告是否存在
    const announcement = await Database.get('SELECT * FROM announcements WHERE id = ?', [id]);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: '公告不存在'
      });
    }

    await Database.run(
      `UPDATE announcements
       SET title = ?, content = ?, priority = ?, is_active = ?
       WHERE id = ?`,
      [
        title || announcement.title,
        content || announcement.content,
        priority !== undefined ? parseInt(priority) : announcement.priority,
        is_active !== undefined ? is_active : announcement.is_active,
        id
      ]
    );

    res.json({
      success: true,
      message: '公告更新成功'
    });
  } catch (error) {
    console.error('更新公告錯誤:', error);
    res.status(500).json({
      success: false,
      message: '更新公告失敗'
    });
  }
});

// 管理員：刪除公告
router.delete('/admin/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // 檢查公告是否存在
    const announcement = await Database.get('SELECT * FROM announcements WHERE id = ?', [id]);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: '公告不存在'
      });
    }

    // 軟刪除（設為不活躍）
    await Database.run(
      'UPDATE announcements SET is_active = 0 WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: '公告刪除成功'
    });
  } catch (error) {
    console.error('刪除公告錯誤:', error);
    res.status(500).json({
      success: false,
      message: '刪除公告失敗'
    });
  }
});

// 管理員：恢復公告
router.put('/admin/:id/restore', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await Database.run(
      'UPDATE announcements SET is_active = 1 WHERE id = ?',
      [id]
    );

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: '公告不存在'
      });
    }

    res.json({
      success: true,
      message: '公告恢復成功'
    });
  } catch (error) {
    console.error('恢復公告錯誤:', error);
    res.status(500).json({
      success: false,
      message: '恢復公告失敗'
    });
  }
});

// 管理員：永久刪除公告
router.delete('/admin/:id/permanent', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️  永久刪除公告請求，ID:', id);

    // 檢查公告是否存在
    const announcement = await Database.get('SELECT * FROM announcements WHERE id = ?', [id]);
    if (!announcement) {
      console.log('❌ 公告不存在，ID:', id);
      return res.status(404).json({
        success: false,
        message: '公告不存在'
      });
    }

    console.log('✅ 找到公告:', announcement.title);

    // 永久刪除（從數據庫中移除）
    const result = await Database.run(
      'DELETE FROM announcements WHERE id = ?',
      [id]
    );

    console.log('📝 刪除結果:', result);

    res.json({
      success: true,
      message: '公告已永久刪除'
    });
  } catch (error) {
    console.error('❌ 永久刪除公告錯誤:', error);
    res.status(500).json({
      success: false,
      message: '永久刪除公告失敗: ' + error.message
    });
  }
});

module.exports = router;
