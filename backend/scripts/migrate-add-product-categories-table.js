#!/usr/bin/env node

const Database = require('../config/database');

async function migrateAddProductCategoriesTable() {
  try {
    console.log('🚀 開始創建產品分類管理表...');
    
    // 1. 創建產品分類表
    console.log('📋 創建 product_categories 表...');
    await Database.run(`
      CREATE TABLE IF NOT EXISTS product_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ product_categories 表創建成功');

    // 2. 檢查是否已有預設分類
    const existingCategories = await Database.all('SELECT * FROM product_categories');
    
    if (existingCategories.length === 0) {
      console.log('📝 插入預設產品分類...');
      
      const defaultCategories = [
        { name: '其他', description: '其他相關產品', sort_order: 1 }
      ];

      for (const category of defaultCategories) {
        await Database.run(
          'INSERT INTO product_categories (name, description, sort_order) VALUES (?, ?, ?)',
          [category.name, category.description, category.sort_order]
        );
        console.log(`✅ 插入分類: ${category.name}`);
      }
      
      console.log('✅ 預設產品分類插入完成');
    } else {
      console.log('✅ 產品分類已存在，跳過初始化');
    }

    console.log('📋 當前產品分類:');
    const categories = await Database.all('SELECT * FROM product_categories ORDER BY sort_order');
    categories.forEach(cat => {
      console.log(`  - ${cat.name} (ID: ${cat.id}, 排序: ${cat.sort_order})`);
    });
    
  } catch (error) {
    console.error('❌ 產品分類表遷移失敗:', error.message);
    throw error;
  }
}

// 如果直接執行此腳本
if (require.main === module) {
  migrateAddProductCategoriesTable()
    .then(() => {
      console.log('✅ 產品分類表遷移完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 產品分類表遷移失敗:', error);
      process.exit(1);
    });
}

module.exports = migrateAddProductCategoriesTable; 