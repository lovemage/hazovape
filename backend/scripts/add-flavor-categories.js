const Database = require('../config/database');

async function addFlavorCategories() {
  try {
    console.log('開始添加口味類別功能...');
    
    // 1. 創建口味類別表
    console.log('1. 創建口味類別表...');
    await Database.run(`
      CREATE TABLE IF NOT EXISTS flavor_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ 口味類別表創建成功');
    
    // 2. 為 flavors 表添加 category_id 字段
    console.log('2. 為口味表添加類別字段...');
    
    // 檢查是否已有 category_id 字段
    const tableInfo = await Database.all("PRAGMA table_info(flavors)");
    const hasCategoryField = tableInfo.some(column => column.name === 'category_id');
    
    if (!hasCategoryField) {
      await Database.run('ALTER TABLE flavors ADD COLUMN category_id INTEGER DEFAULT 1');
      console.log('✅ 為口味表添加了類別字段');
    } else {
      console.log('✅ 口味表已有類別字段');
    }
    
    // 3. 插入默認類別
    console.log('3. 插入默認類別...');
    
    const defaultCategories = [
      { name: '綠茶系列', description: '清香淡雅的綠茶口味', sort_order: 1 },
      { name: '烏龍茶系列', description: '半發酵的烏龍茶口味', sort_order: 2 },
      { name: '紅茶系列', description: '濃郁醇厚的紅茶口味', sort_order: 3 },
      { name: '花茶系列', description: '芳香怡人的花茶口味', sort_order: 4 },
      { name: '普洱茶系列', description: '陳香回甘的普洱茶口味', sort_order: 5 },
      { name: '特色茶系列', description: '獨特風味的特色茶口味', sort_order: 6 }
    ];
    
    for (const category of defaultCategories) {
      try {
        await Database.run(
          'INSERT OR IGNORE INTO flavor_categories (name, description, sort_order) VALUES (?, ?, ?)',
          [category.name, category.description, category.sort_order]
        );
        console.log(`✅ 添加類別: ${category.name}`);
      } catch (error) {
        console.log(`⚠️  類別 ${category.name} 已存在`);
      }
    }
    
    // 4. 更新現有口味的類別
    console.log('4. 更新現有口味的類別...');
    
    const existingFlavors = await Database.all('SELECT id, name FROM flavors');
    
    // 根據口味名稱自動分類
    const flavorCategoryMapping = {
      '茉莉花茶': 4, // 花茶系列
      '綠茶': 1,     // 綠茶系列
      '烏龍茶': 2,   // 烏龍茶系列
      '紅茶': 3,     // 紅茶系列
      '普洱茶': 5,   // 普洱茶系列
      '鐵觀音': 2,   // 烏龍茶系列
      '龍井': 1,     // 綠茶系列
      '大紅袍': 2,   // 烏龍茶系列
      '正山小種': 3, // 紅茶系列
      '玫瑰花茶': 4, // 花茶系列
      '菊花茶': 4,   // 花茶系列
    };
    
    for (const flavor of existingFlavors) {
      let categoryId = 6; // 默認為特色茶系列
      
      // 根據名稱匹配類別
      for (const [keyword, catId] of Object.entries(flavorCategoryMapping)) {
        if (flavor.name.includes(keyword)) {
          categoryId = catId;
          break;
        }
      }
      
      await Database.run(
        'UPDATE flavors SET category_id = ? WHERE id = ?',
        [categoryId, flavor.id]
      );
      
      console.log(`✅ 更新口味 "${flavor.name}" 到類別 ${categoryId}`);
    }
    
    // 5. 驗證結果
    console.log('5. 驗證結果...');
    
    const categories = await Database.all('SELECT * FROM flavor_categories ORDER BY sort_order');
    const flavorsWithCategory = await Database.all(`
      SELECT f.id, f.name, f.stock, fc.name as category_name 
      FROM flavors f 
      LEFT JOIN flavor_categories fc ON f.category_id = fc.id 
      ORDER BY fc.sort_order, f.sort_order
    `);
    
    console.log('\n📊 類別列表:');
    categories.forEach(cat => {
      console.log(`- ${cat.name} (ID: ${cat.id}): ${cat.description}`);
    });
    
    console.log('\n📊 口味分類結果:');
    flavorsWithCategory.forEach(flavor => {
      console.log(`- ${flavor.name} (庫存: ${flavor.stock}) → ${flavor.category_name || '未分類'}`);
    });
    
    console.log('\n✅ 口味類別功能添加完成！');
    console.log('');
    console.log('新的口味管理流程：');
    console.log('1. 選擇類別（綠茶、烏龍茶、紅茶等）');
    console.log('2. 輸入口味名稱');
    console.log('3. 設置排序順序');
    console.log('4. 設置庫存數量');
    
  } catch (error) {
    console.error('添加口味類別功能失敗:', error);
    throw error;
  }
}

// 如果直接運行此腳本
if (require.main === module) {
  addFlavorCategories().then(() => {
    console.log('腳本執行完成');
    process.exit(0);
  }).catch(err => {
    console.error('腳本執行失敗:', err);
    process.exit(1);
  });
}

module.exports = addFlavorCategories;
