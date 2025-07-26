const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Database = require('../config/database');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'mist-mall-secret-key';

// 管理員登入
router.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '用戶名和密碼不能為空'
      });
    }

    // 查找管理員
    const admin = await Database.get(
      'SELECT * FROM admin_users WHERE username = ? AND is_active = 1',
      [username]
    );

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: '用戶名或密碼錯誤'
      });
    }

    // 驗證密碼
    const isValidPassword = await bcrypt.compare(password, admin.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: '用戶名或密碼錯誤'
      });
    }

    // 登入成功，不需要更新時間戳（表中沒有 last_login 字段）

    // 生成 JWT token
    const token = jwt.sign(
      { 
        id: admin.id, 
        username: admin.username,
        type: 'admin'
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: '登入成功',
      data: {
        token,
        admin: {
          id: admin.id,
          username: admin.username
        }
      }
    });

  } catch (error) {
    console.error('管理員登入錯誤:', error);
    res.status(500).json({
      success: false,
      message: '服務器錯誤'
    });
  }
});

// 驗證 token 中間件
const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: '未提供認證令牌'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '權限不足'
      });
    }

    // 驗證管理員是否仍然有效
    const admin = await Database.get(
      'SELECT id, username FROM admin_users WHERE id = ? AND is_active = 1',
      [decoded.id]
    );

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: '令牌無效'
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: '令牌無效'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: '令牌已過期'
      });
    }

    console.error('認證錯誤:', error);
    res.status(500).json({
      success: false,
      message: '認證服務錯誤'
    });
  }
};

// 驗證 token 有效性
router.get('/admin/verify', authenticateAdmin, (req, res) => {
  res.json({
    success: true,
    data: {
      admin: req.admin
    }
  });
});

// 管理員修改密碼
router.put('/admin/change-password', authenticateAdmin, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: '請填寫所有必要字段'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: '新密碼與確認密碼不一致'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: '新密碼長度至少6個字符'
      });
    }

    // 獲取當前管理員信息
    const admin = await Database.get(
      'SELECT * FROM admin_users WHERE id = ?',
      [req.admin.id]
    );

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: '管理員不存在'
      });
    }

    // 驗證當前密碼
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, admin.password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: '當前密碼錯誤'
      });
    }

    // 生成新密碼哈希
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // 更新密碼
    await Database.run(
      'UPDATE admin_users SET password_hash = ? WHERE id = ?',
      [newPasswordHash, req.admin.id]
    );

    res.json({
      success: true,
      message: '密碼修改成功'
    });

  } catch (error) {
    console.error('修改密碼錯誤:', error);
    res.status(500).json({
      success: false,
      message: '修改密碼失敗'
    });
  }
});

module.exports = { router, authenticateAdmin };
