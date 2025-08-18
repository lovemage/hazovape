#!/usr/bin/env node

const Database = require('../config/database');

async function migrateAddProductCategory() {
  try {
    console.log('🚀 開始添加產品分類字段...');
    
    // 檢查 products 表是否存在
    const tableExists = await Database.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='products'"
    );
    
    if (!tableExists) {
      console.log('⚠️  products 表不存在，跳過分類字段遷移');
      return;
    }
    
    // 檢查是否已經有 category 字段
    const tableInfo = await Database.all("PRAGMA table_info(products)");
    const hasCategoryField = tableInfo.some(column => column.name === 'category');
    
    if (hasCategoryField) {
      console.log('✅ products 表已有 category 字段，跳過遷移');
      return;
    }
    
    // 添加 category 字段
    console.log('📝 添加 category 字段到 products 表...');
    await Database.run(`
      ALTER TABLE products 
      ADD COLUMN category TEXT DEFAULT '其他'
    `);
    
    console.log('✅ 產品分類字段添加成功');
    console.log('📋 可用分類:');
    console.log('  - 其他');
    
  } catch (error) {
    console.error('❌ 產品分類字段遷移失敗:', error.message);
    throw error;
  }
}

// 如果直接執行此腳本
if (require.main === module) {
  migrateAddProductCategory()
    .then(() => {
      console.log('✅ 產品分類遷移完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 產品分類遷移失敗:', error);
      process.exit(1);
    });
}

module.exports = migrateAddProductCategory; 