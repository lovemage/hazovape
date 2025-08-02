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

// 調試規格圖片問題
router.get('/flavors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔍 調試規格ID:', id);
    
    // 檢查表結構
    const tableInfo = await Database.all("PRAGMA table_info(flavors)");
    const hasImageField = tableInfo.some(col => col.name === 'image');
    
    // 獲取規格數據
    const flavor = await Database.get('SELECT * FROM flavors WHERE id = ?', [id]);
    
    console.log('📋 表結構包含字段:', tableInfo.map(col => col.name));
    console.log('📷 是否有image字段:', hasImageField);
    console.log('🎯 規格數據:', flavor);
    
    res.json({
      success: true,
      data: {
        hasImageField,
        tableColumns: tableInfo.map(col => col.name),
        flavorData: flavor
      }
    });
  } catch (error) {
    console.error('❌ 調試規格失敗:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 調試規格列表API
router.get('/flavors-list', async (req, res) => {
  try {
    console.log('🔍 調試規格列表API...');
    
    // 檢查表結構
    const tableInfo = await Database.all("PRAGMA table_info(flavors)");
    const hasImageField = tableInfo.some(col => col.name === 'image');
    const hasPriceField = tableInfo.some(col => col.name === 'price');
    
    console.log('📋 表結構包含字段:', tableInfo.map(col => col.name));
    console.log('📷 是否有image字段:', hasImageField);
    console.log('💰 是否有price字段:', hasPriceField);
    
    // 模擬admin/all的查詢
    let query;
    if (hasPriceField && hasImageField) {
      query = `
        SELECT f.id, f.name, f.product_id, f.category_id, f.stock, f.sort_order, 
               f.is_active, f.created_at, f.price, f.image,
               p.name as product_name, p.price as product_base_price,
               fc.name as category_name,
               CASE WHEN f.price IS NOT NULL THEN f.price ELSE p.price END as final_price
        FROM flavors f
        LEFT JOIN products p ON f.product_id = p.id
        LEFT JOIN flavor_categories fc ON f.category_id = fc.id
        WHERE f.id = 16
      `;
    } else {
      query = `SELECT * FROM flavors WHERE id = 16`;
    }
    
    const flavors = await Database.all(query);
    
    console.log('🎯 查詢結果:', flavors);
    
    res.json({
      success: true,
      data: {
        hasImageField,
        hasPriceField,
        tableColumns: tableInfo.map(col => col.name),
        queryUsed: query,
        flavors: flavors
      }
    });
  } catch (error) {
    console.error('❌ 調試規格列表失敗:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 生產環境數據庫遷移 - 添加image字段 (GET版本)
router.get('/migrate-add-image-field', async (req, res) => {
  try {
    console.log('🔄 開始為生產環境添加image字段...');
    
    // 檢查image字段是否已存在
    const tableInfo = await Database.all("PRAGMA table_info(flavors)");
    const hasImageField = tableInfo.some(col => col.name === 'image');
    
    if (hasImageField) {
      console.log('✅ image字段已存在，無需遷移');
      return res.json({
        success: true,
        message: 'image字段已存在，無需遷移',
        hasImageField: true
      });
    }
    
    console.log('📋 當前表結構:', tableInfo.map(col => col.name));
    
    // 添加image字段
    await Database.run(`
      ALTER TABLE flavors
      ADD COLUMN image TEXT NULL
    `);
    
    console.log('✅ 成功添加image字段');
    
    // 驗證字段已添加
    const updatedTableInfo = await Database.all("PRAGMA table_info(flavors)");
    const newHasImageField = updatedTableInfo.some(col => col.name === 'image');
    
    // 檢查現有規格數量
    const flavorCount = await Database.get('SELECT COUNT(*) as count FROM flavors');
    
    console.log('📊 遷移完成統計:', {
      新字段已添加: newHasImageField,
      現有規格數量: flavorCount.count,
      新表結構: updatedTableInfo.map(col => col.name)
    });
    
    res.json({
      success: true,
      message: '成功為生產環境添加image字段',
      migration: {
        hasImageFieldBefore: false,
        hasImageFieldAfter: newHasImageField,
        existingFlavorsCount: flavorCount.count,
        newTableColumns: updatedTableInfo.map(col => col.name)
      }
    });
    
  } catch (error) {
    console.error('❌ 添加image字段失敗:', error);
    res.status(500).json({
      success: false,
      message: '數據庫遷移失敗: ' + error.message
    });
  }
});

// 檢查文件系統狀態
router.get('/filesystem-check', async (req, res) => {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    
    console.log('🔍 檢查文件系統狀態...');
    
    // 獲取當前工作目錄
    const cwd = process.cwd();
    
    // 檢查不同路徑下的uploads目錄
    const pathsToCheck = [
      path.join(cwd, 'uploads'),
      path.join(cwd, 'backend', 'uploads'), 
      '/app/data/uploads',
      '/app/uploads'
    ];
    
    const results = [];
    
    for (const checkPath of pathsToCheck) {
      try {
        const stat = await fs.stat(checkPath);
        let subDirs = [];
        
        if (stat.isDirectory()) {
          try {
            const items = await fs.readdir(checkPath);
            const dirChecks = await Promise.all(items.map(async item => {
              try {
                const itemStat = await fs.stat(path.join(checkPath, item));
                return itemStat.isDirectory() ? item : null;
              } catch {
                return null;
              }
            }));
            subDirs = dirChecks.filter(item => item !== null);
          } catch (e) {
            subDirs = ['無法讀取'];
          }
        }
        
        results.push({
          path: checkPath,
          exists: true,
          type: stat.isDirectory() ? 'directory' : 'file',
          subDirectories: subDirs
        });
      } catch (error) {
        results.push({
          path: checkPath,
          exists: false,
          error: error.message
        });
      }
    }
    
    // 檢查特定的flavors圖片文件
    const flavorImagePath = 'uploads/flavors/flavor_1754157058559_wkgjz3jme.png';
    const possiblePaths = [
      path.join(cwd, flavorImagePath),
      path.join(cwd, 'backend', flavorImagePath),
      path.join('/app/data', flavorImagePath),
      path.join('/app', flavorImagePath)
    ];
    
    const flavorFileResults = [];
    for (const filePath of possiblePaths) {
      try {
        const stat = await fs.stat(filePath);
        flavorFileResults.push({
          path: filePath,
          exists: true,
          size: stat.size,
          modified: stat.mtime
        });
      } catch (error) {
        flavorFileResults.push({
          path: filePath,
          exists: false,
          error: error.message
        });
      }
    }
    
    console.log('📋 文件系統檢查結果:', { results, flavorFileResults });
    
    res.json({
      success: true,
      data: {
        currentWorkingDirectory: cwd,
        uploadPaths: results,
        flavorImageSearch: flavorFileResults,
        configuredStaticPath: process.env.NODE_ENV === 'production' ? '/app/data/uploads' : path.join(__dirname, 'uploads')
      }
    });
    
  } catch (error) {
    console.error('❌ 文件系統檢查失敗:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
