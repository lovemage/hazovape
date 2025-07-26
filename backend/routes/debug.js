const express = require('express');
const router = express.Router();
const Database = require('../config/database');

// 臨時調試端點 - 查看數據庫表結構
router.get('/tables', async (req, res) => {
  try {
    console.log('🔍 查看數據庫表結構...');
    
    // 獲取所有表名
    const tables = await Database.all(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `);
    
    console.log('📋 數據庫中的表:', tables);
    
    const tableInfo = {};
    
    for (const table of tables) {
      try {
        // 獲取表結構
        const columns = await Database.all(`PRAGMA table_info(${table.name})`);
        tableInfo[table.name] = {
          columns: columns,
          sample: null
        };
        
        // 獲取樣本數據（前3行）
        try {
          const sample = await Database.all(`SELECT * FROM ${table.name} LIMIT 3`);
          tableInfo[table.name].sample = sample;
        } catch (sampleError) {
          console.log(`⚠️  無法獲取 ${table.name} 的樣本數據:`, sampleError.message);
        }
        
        console.log(`✅ 表 ${table.name} 結構:`, columns);
      } catch (error) {
        console.error(`❌ 獲取表 ${table.name} 結構失敗:`, error.message);
        tableInfo[table.name] = { error: error.message };
      }
    }
    
    res.json({
      success: true,
      data: {
        tables: tables.map(t => t.name),
        tableInfo: tableInfo
      }
    });
    
  } catch (error) {
    console.error('❌ 查看數據庫表結構失敗:', error);
    res.status(500).json({
      success: false,
      message: '查看數據庫表結構失敗',
      error: error.message
    });
  }
});

// 查看特定表的詳細信息
router.get('/table/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    console.log(`🔍 查看表 ${tableName} 的詳細信息...`);
    
    // 檢查表是否存在
    const tableExists = await Database.get(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name = ?
    `, [tableName]);
    
    if (!tableExists) {
      return res.status(404).json({
        success: false,
        message: `表 ${tableName} 不存在`
      });
    }
    
    // 獲取表結構
    const columns = await Database.all(`PRAGMA table_info(${tableName})`);
    
    // 獲取所有數據
    const data = await Database.all(`SELECT * FROM ${tableName}`);
    
    console.log(`✅ 表 ${tableName} 詳細信息:`, { columns, rowCount: data.length });
    
    res.json({
      success: true,
      data: {
        tableName,
        columns,
        rowCount: data.length,
        data: data
      }
    });
    
  } catch (error) {
    console.error(`❌ 查看表 ${req.params.tableName} 失敗:`, error);
    res.status(500).json({
      success: false,
      message: '查看表信息失敗',
      error: error.message
    });
  }
});

module.exports = router;
