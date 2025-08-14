const express = require('express');
const Database = require('../config/database');
const { authenticateAdmin } = require('./auth');

const router = express.Router();

// 前端API：驗證優惠券
router.post('/validate', async (req, res) => {
  try {
    const { code, customerPhone, subtotal } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({
        success: false,
        message: '請輸入優惠券代碼'
      });
    }

    if (!customerPhone) {
      return res.status(400).json({
        success: false,
        message: '請提供客戶電話'
      });
    }

    console.log('🎫 驗證優惠券:', { code, customerPhone, subtotal });

    // 查找優惠券
    const coupon = await Database.get(`
      SELECT * FROM coupons 
      WHERE code = ? AND is_active = 1
    `, [code.trim().toUpperCase()]);

    if (!coupon) {
      return res.json({
        success: false,
        message: '優惠券不存在或已失效'
      });
    }

    // 檢查有效期
    const now = new Date();
    const validFrom = new Date(coupon.valid_from);
    const validUntil = new Date(coupon.valid_until);

    if (now < validFrom || now > validUntil) {
      return res.json({
        success: false,
        message: '優惠券已過期'
      });
    }

    // 檢查最低訂單金額
    if (subtotal < coupon.min_order_amount) {
      return res.json({
        success: false,
        message: `訂單金額需滿 NT$ ${coupon.min_order_amount} 才能使用此優惠券`
      });
    }

    // 檢查全域使用次數限制
    if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
      return res.json({
        success: false,
        message: '優惠券使用次數已達上限'
      });
    }

    // 檢查個人使用次數限制
    if (coupon.per_user_limit) {
      const userUsageCount = await Database.get(`
        SELECT COUNT(*) as count FROM coupon_usages 
        WHERE coupon_id = ? AND customer_phone = ?
      `, [coupon.id, customerPhone]);

      if (userUsageCount.count >= coupon.per_user_limit) {
        return res.json({
          success: false,
          message: `此優惠券每人限用 ${coupon.per_user_limit} 次`
        });
      }
    }

    // 計算折扣金額
    let discountAmount = 0;
    let freeShipping = false;

    switch (coupon.type) {
      case 'percentage':
        discountAmount = Math.round(subtotal * (coupon.value / 100));
        if (coupon.max_discount && discountAmount > coupon.max_discount) {
          discountAmount = coupon.max_discount;
        }
        break;
      case 'fixed_amount':
        discountAmount = Math.min(coupon.value, subtotal);
        break;
      case 'free_shipping':
        freeShipping = true;
        discountAmount = 0; // 免運不算在金額折扣中
        break;
    }

    console.log('✅ 優惠券驗證成功:', { 
      coupon: coupon.code, 
      discountAmount, 
      freeShipping 
    });

    res.json({
      success: true,
      data: {
        coupon: {
          id: coupon.id,
          code: coupon.code,
          name: coupon.name,
          description: coupon.description,
          type: coupon.type,
          value: coupon.value
        },
        discountAmount,
        freeShipping,
        message: `優惠券 ${coupon.name} 適用成功！`
      }
    });

  } catch (error) {
    console.error('❌ 驗證優惠券失敗:', error);
    res.status(500).json({
      success: false,
      message: '驗證優惠券失敗'
    });
  }
});

// 管理員API：獲取所有優惠券
router.get('/admin/all', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '1=1';
    let params = [];

    if (search) {
      whereClause += ' AND (code LIKE ? OR name LIKE ? OR description LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (status === 'active') {
      whereClause += ' AND is_active = 1';
    } else if (status === 'inactive') {
      whereClause += ' AND is_active = 0';
    }

    const coupons = await Database.all(`
      SELECT 
        *,
        (SELECT COUNT(*) FROM coupon_usages WHERE coupon_id = coupons.id) as actual_used_count
      FROM coupons 
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    const totalCoupons = await Database.get(`
      SELECT COUNT(*) as count FROM coupons WHERE ${whereClause}
    `, params);

    res.json({
      success: true,
      data: {
        coupons,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(totalCoupons.count / limit),
          total_items: totalCoupons.count
        }
      }
    });

  } catch (error) {
    console.error('❌ 獲取優惠券失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取優惠券失敗'
    });
  }
});

// 管理員API：創建優惠券
router.post('/admin', authenticateAdmin, async (req, res) => {
  try {
    const {
      code, name, description, type, value, min_order_amount,
      max_discount, usage_limit, per_user_limit, valid_from, valid_until
    } = req.body;

    // 驗證必填字段
    if (!code || !name || !type || value === undefined || !valid_from || !valid_until) {
      return res.status(400).json({
        success: false,
        message: '請填寫所有必填字段'
      });
    }

    // 驗證優惠券類型
    if (!['percentage', 'fixed_amount', 'free_shipping'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: '無效的優惠券類型'
      });
    }

    // 檢查代碼是否已存在
    const existingCoupon = await Database.get('SELECT id FROM coupons WHERE code = ?', [code.toUpperCase()]);
    if (existingCoupon) {
      return res.status(400).json({
        success: false,
        message: '優惠券代碼已存在'
      });
    }

    const result = await Database.run(`
      INSERT INTO coupons (
        code, name, description, type, value, min_order_amount,
        max_discount, usage_limit, per_user_limit, valid_from, valid_until
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id
    `, [
      code.toUpperCase(), name, description || '', type, value, min_order_amount || 0,
      max_discount, usage_limit, per_user_limit || 1, valid_from, valid_until
    ]);

    console.log('✅ 優惠券創建成功:', code);

    res.json({
      success: true,
      message: '優惠券創建成功',
      data: { id: result.id }
    });

  } catch (error) {
    console.error('❌ 創建優惠券失敗:', error);
    res.status(500).json({
      success: false,
      message: '創建優惠券失敗'
    });
  }
});

// 管理員API：更新優惠券
router.put('/admin/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      code, name, description, type, value, min_order_amount,
      max_discount, usage_limit, per_user_limit, valid_from, valid_until, is_active
    } = req.body;

    // 檢查優惠券是否存在
    const existingCoupon = await Database.get('SELECT * FROM coupons WHERE id = ?', [id]);
    if (!existingCoupon) {
      return res.status(404).json({
        success: false,
        message: '優惠券不存在'
      });
    }

    // 檢查代碼是否與其他優惠券衝突
    if (code && code.toUpperCase() !== existingCoupon.code) {
      const duplicateCoupon = await Database.get('SELECT id FROM coupons WHERE code = ? AND id != ?', [code.toUpperCase(), id]);
      if (duplicateCoupon) {
        return res.status(400).json({
          success: false,
          message: '優惠券代碼已存在'
        });
      }
    }

    await Database.run(`
      UPDATE coupons SET
        code = ?, name = ?, description = ?, type = ?, value = ?,
        min_order_amount = ?, max_discount = ?, usage_limit = ?,
        per_user_limit = ?, valid_from = ?, valid_until = ?, is_active = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      code?.toUpperCase() || existingCoupon.code,
      name || existingCoupon.name,
      description !== undefined ? description : existingCoupon.description,
      type || existingCoupon.type,
      value !== undefined ? value : existingCoupon.value,
      min_order_amount !== undefined ? min_order_amount : existingCoupon.min_order_amount,
      max_discount !== undefined ? max_discount : existingCoupon.max_discount,
      usage_limit !== undefined ? usage_limit : existingCoupon.usage_limit,
      per_user_limit !== undefined ? per_user_limit : existingCoupon.per_user_limit,
      valid_from || existingCoupon.valid_from,
      valid_until || existingCoupon.valid_until,
      is_active !== undefined ? (is_active ? 1 : 0) : existingCoupon.is_active,
      id
    ]);

    console.log('✅ 優惠券更新成功:', id);

    res.json({
      success: true,
      message: '優惠券更新成功'
    });

  } catch (error) {
    console.error('❌ 更新優惠券失敗:', error);
    res.status(500).json({
      success: false,
      message: '更新優惠券失敗'
    });
  }
});

// 管理員API：刪除優惠券
router.delete('/admin/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // 檢查是否有使用記錄
    const usageCount = await Database.get('SELECT COUNT(*) as count FROM coupon_usages WHERE coupon_id = ?', [id]);
    
    if (usageCount.count > 0) {
      // 如果有使用記錄，只停用不刪除
      await Database.run('UPDATE coupons SET is_active = 0 WHERE id = ?', [id]);
      res.json({
        success: true,
        message: '優惠券已停用（因為有使用記錄）'
      });
    } else {
      // 如果沒有使用記錄，可以直接刪除
      await Database.run('DELETE FROM coupons WHERE id = ?', [id]);
      res.json({
        success: true,
        message: '優惠券已刪除'
      });
    }

    console.log('✅ 優惠券刪除/停用成功:', id);

  } catch (error) {
    console.error('❌ 刪除優惠券失敗:', error);
    res.status(500).json({
      success: false,
      message: '刪除優惠券失敗'
    });
  }
});

// 管理員API：獲取優惠券使用統計
router.get('/admin/:id/stats', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const coupon = await Database.get('SELECT * FROM coupons WHERE id = ?', [id]);
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: '優惠券不存在'
      });
    }

    // 獲取使用統計
    const stats = await Database.get(`
      SELECT 
        COUNT(*) as total_uses,
        SUM(discount_amount) as total_discount,
        COUNT(DISTINCT customer_phone) as unique_users
      FROM coupon_usages 
      WHERE coupon_id = ?
    `, [id]);

    // 獲取最近使用記錄
    const recentUsages = await Database.all(`
      SELECT 
        cu.*,
        o.order_number,
        o.customer_name,
        o.total_amount
      FROM coupon_usages cu
      JOIN orders o ON cu.order_id = o.id
      WHERE cu.coupon_id = ?
      ORDER BY cu.used_at DESC
      LIMIT 10
    `, [id]);

    res.json({
      success: true,
      data: {
        coupon,
        stats: {
          total_uses: stats.total_uses || 0,
          total_discount: stats.total_discount || 0,
          unique_users: stats.unique_users || 0,
          remaining_uses: coupon.usage_limit ? Math.max(0, coupon.usage_limit - (stats.total_uses || 0)) : null
        },
        recent_usages: recentUsages
      }
    });

  } catch (error) {
    console.error('❌ 獲取優惠券統計失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取優惠券統計失敗'
    });
  }
});

module.exports = router;
