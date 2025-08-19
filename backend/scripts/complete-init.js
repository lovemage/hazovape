const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const Database = require('../config/database');

async function completeInit() {
  try {
    console.log('🚀 開始完整數據庫初始化...');
    console.log('環境:', process.env.NODE_ENV || 'development');

    // 確保數據庫目錄存在
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log('✅ 創建數據目錄:', dataDir);
    }

    // 1. 執行基本 SQL 初始化
    console.log('1. 執行基本 SQL 初始化...');
    const sqlPath = path.join(__dirname, '../database.sql');

    if (!fs.existsSync(sqlPath)) {
      console.log('⚠️  database.sql 不存在，跳過 SQL 初始化');
    } else {
      const sqlScript = fs.readFileSync(sqlPath, 'utf8');
    
      const statements = sqlScript
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);

      for (const statement of statements) {
        if (statement.trim()) {
          try {
            await Database.run(statement);
            console.log('✅ 執行 SQL:', statement.substring(0, 50) + '...');
          } catch (error) {
            if (!error.message.includes('already exists')) {
              console.error('❌ SQL 執行失敗:', error.message);
            }
          }
        }
      }
    }
    
    // 2. 確保 admin_users 表存在並創建管理員用戶
    console.log('2. 創建管理員用戶...');

    // 先確保表存在
    try {
      await Database.run(`
        CREATE TABLE IF NOT EXISTS admin_users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ admin_users 表已確保存在');
    } catch (error) {
      console.error('❌ 創建 admin_users 表失敗:', error);
    }

    // 檢查是否已有管理員用戶
    try {
      const existingAdmin = await Database.get('SELECT id, username FROM admin_users WHERE username = ?', ['admin']);
      
      if (existingAdmin) {
        console.log('✅ 管理員用戶已存在，跳過創建');
        console.log('📝 現有管理員用戶 ID:', existingAdmin.id, '用戶名:', existingAdmin.username);
      } else {
        // 只有在沒有管理員時才創建預設管理員
        console.log('📝 沒有找到管理員用戶，創建預設管理員');
        
        const adminPassword = await bcrypt.hash('admin123', 12);
        console.log('🔐 生成密碼哈希:', adminPassword.substring(0, 20) + '...');

        const result = await Database.run(
          'INSERT INTO admin_users (username, password_hash, is_active) VALUES (?, ?, ?)',
          ['admin', adminPassword, 1]
        );
        console.log('✅ 預設管理員用戶創建成功 (ID:', result.lastID, ')');
        console.log('🔑 用戶名: admin');
        console.log('🔑 密碼: admin123');
      }
    } catch (error) {
      console.error('❌ 管理員用戶處理失敗:', error);
      // 不拋出錯誤，允許系統繼續運行
    }
    
    // 3. 創建口味類別
    console.log('3. 創建口味類別...');
    const categories = [
      { id: 1, name: '綠茶系列', description: '清香淡雅的綠茶口味', sort_order: 1 },
      { id: 2, name: '烏龍茶系列', description: '半發酵的烏龍茶口味', sort_order: 2 },
      { id: 3, name: '紅茶系列', description: '濃郁醇厚的紅茶口味', sort_order: 3 },
      { id: 4, name: '花茶系列', description: '芳香怡人的花茶口味', sort_order: 4 },
      { id: 5, name: '普洱茶系列', description: '陳香回甘的普洱茶口味', sort_order: 5 },
      { id: 6, name: '特色茶系列', description: '獨特風味的特色茶口味', sort_order: 6 },
      { id: 7, name: '茶葉系列', description: '各種茶葉口味', sort_order: 7 },
      { id: 8, name: '咖啡系列', description: '各種咖啡口味', sort_order: 8 },
      { id: 9, name: '奶茶系列', description: '各種奶茶口味', sort_order: 9 },
      { id: 10, name: '果茶系列', description: '各種果茶口味', sort_order: 10 },
      { id: 11, name: '特調系列', description: '特色調配口味', sort_order: 11 },
      { id: 12, name: '其他系列', description: '其他特殊口味', sort_order: 12 }
    ];
    
    for (const category of categories) {
      try {
        await Database.run(
          'INSERT OR REPLACE INTO flavor_categories (id, name, description, sort_order) VALUES (?, ?, ?, ?)',
          [category.id, category.name, category.description, category.sort_order]
        );
        console.log(`✅ 創建類別: ${category.name}`);
      } catch (error) {
        console.error(`❌ 創建類別失敗 ${category.name}:`, error);
      }
    }
    
    // 4. 確保商品表有正確的數據
    console.log('4. 檢查商品數據...');
    const productCount = await Database.get('SELECT COUNT(*) as count FROM products');
    if (productCount.count === 0) {
      console.log('創建示例商品...');
      const sampleProducts = [
        { name: '精選茶葉禮盒', price: 299, is_active: 1 },
        { name: '經典咖啡豆', price: 199, is_active: 1 },
        { name: '手工餅乾組合', price: 149, is_active: 1 }
      ];
      
      for (const product of sampleProducts) {
        await Database.run(
          'INSERT INTO products (name, price, is_active) VALUES (?, ?, ?)',
          [product.name, product.price, product.is_active]
        );
        console.log(`✅ 創建商品: ${product.name}`);
      }
    }
    
    // 5. 為每個商品創建基本口味
    console.log('5. 為商品創建基本口味...');
    const products = await Database.all('SELECT id, name FROM products WHERE is_active = 1');
    
    for (const product of products) {
      const flavorCount = await Database.get(
        'SELECT COUNT(*) as count FROM flavors WHERE product_id = ?',
        [product.id]
      );
      
      if (flavorCount.count === 0) {
        const basicFlavors = [
          { name: '原味', category_id: 12, sort_order: 1, stock: 100 },
          { name: '微糖', category_id: 12, sort_order: 2, stock: 100 },
          { name: '半糖', category_id: 12, sort_order: 3, stock: 100 },
          { name: '少糖', category_id: 12, sort_order: 4, stock: 100 },
          { name: '無糖', category_id: 12, sort_order: 5, stock: 100 }
        ];
        
        for (const flavor of basicFlavors) {
          await Database.run(
            'INSERT INTO flavors (name, product_id, category_id, sort_order, stock) VALUES (?, ?, ?, ?, ?)',
            [`${product.name}-${flavor.name}`, product.id, flavor.category_id, flavor.sort_order, flavor.stock]
          );
          console.log(`✅ 為 ${product.name} 創建口味: ${flavor.name}`);
        }
      }
    }
    
    // 6. 創建示例公告
    console.log('6. 跳過創建示例公告...');
    const announcementCount = await Database.get('SELECT COUNT(*) as count FROM announcements');
    if (announcementCount.count === 0) {
      // await Database.run(
      //   'INSERT INTO announcements (title, content, is_active, priority) VALUES (?, ?, ?, ?)',
      //   ['歡迎來到 Mist Mall', '感謝您選擇我們的商品！我們提供最優質的茶葉和咖啡產品。', 1, 1]
      // );
      console.log('⏭️ 跳過創建示例公告');
    }
    
    // 7. 驗證數據
    console.log('7. 驗證數據...');
    const stats = {
      products: await Database.get('SELECT COUNT(*) as count FROM products'),
      flavors: await Database.get('SELECT COUNT(*) as count FROM flavors'),
      categories: await Database.get('SELECT COUNT(*) as count FROM flavor_categories'),
      announcements: await Database.get('SELECT COUNT(*) as count FROM announcements'),
      admins: await Database.get('SELECT COUNT(*) as count FROM admin_users')
    };
    
    console.log('\n📊 數據庫初始化完成！統計信息：');
    console.log(`- 商品數量: ${stats.products.count}`);
    console.log(`- 口味數量: ${stats.flavors.count}`);
    console.log(`- 類別數量: ${stats.categories.count}`);
    console.log(`- 公告數量: ${stats.announcements.count}`);
    console.log(`- 管理員數量: ${stats.admins.count}`);
    console.log('\n🔑 管理員登入信息：');
    console.log('用戶名: admin');
    console.log('密碼: admin123');

    // 8. 驗證管理員登入
    console.log('\n8. 驗證管理員登入...');
    try {
      const adminUser = await Database.get(
        'SELECT * FROM admin_users WHERE username = ?',
        ['admin']
      );

      if (adminUser) {
        const isValidPassword = await bcrypt.compare('admin123', adminUser.password_hash);
        if (isValidPassword) {
          console.log('✅ 管理員登入驗證成功！');
        } else {
          console.error('❌ 管理員密碼驗證失敗！');
          throw new Error('管理員密碼驗證失敗');
        }
      } else {
        console.error('❌ 找不到管理員用戶！');
        throw new Error('找不到管理員用戶');
      }
    } catch (error) {
      console.error('❌ 管理員登入驗證失敗:', error);
      throw error;
    }
    
  } catch (error) {
    console.error('❌ 完整初始化失敗:', error);
    throw error;
  }
}

// 如果直接運行此腳本
if (require.main === module) {
  completeInit().then(() => {
    console.log('✅ 腳本執行完成');
    process.exit(0);
  }).catch(err => {
    console.error('❌ 腳本執行失敗:', err);
    process.exit(1);
  });
}

module.exports = completeInit;
