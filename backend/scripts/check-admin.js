const bcrypt = require('bcrypt');
const Database = require('../config/database');

async function checkAndCreateAdmin() {
  try {
    console.log('檢查管理員用戶...');
    
    // 檢查admin用戶是否存在
    const existingAdmin = await Database.get(
      'SELECT * FROM admin_users WHERE username = ?',
      ['admin']
    );
    
    if (existingAdmin) {
      console.log('管理員用戶已存在:');
      console.log('- 用戶名:', existingAdmin.username);
      console.log('- 郵箱:', existingAdmin.email);
      console.log('- 是否啟用:', existingAdmin.is_active ? '是' : '否');
      console.log('- 創建時間:', existingAdmin.created_at);
      
      // 驗證密碼哈希
      const testPassword = 'admin123';
      const isValidHash = await bcrypt.compare(testPassword, existingAdmin.password_hash);
      console.log('- 密碼哈希驗證:', isValidHash ? '正確' : '錯誤');
      
      if (!isValidHash) {
        console.log('密碼哈希不正確，重新生成...');
        const newPasswordHash = await bcrypt.hash(testPassword, 12);
        await Database.run(
          'UPDATE admin_users SET password_hash = ? WHERE username = ?',
          [newPasswordHash, 'admin']
        );
        console.log('密碼哈希已更新');
      }
    } else {
      console.log('管理員用戶不存在，正在創建...');
      
      // 生成密碼哈希
      const passwordHash = await bcrypt.hash('admin123', 12);
      
      // 創建管理員用戶
      const result = await Database.run(
        'INSERT INTO admin_users (username, password_hash, email, is_active) VALUES (?, ?, ?, ?)',
        ['admin', passwordHash, 'admin@mistmall.com', 1]
      );
      
      console.log('管理員用戶創建成功，ID:', result.id);
    }
    
    // 最終驗證
    const finalAdmin = await Database.get(
      'SELECT * FROM admin_users WHERE username = ?',
      ['admin']
    );
    
    if (finalAdmin) {
      const testPassword = 'admin123';
      const isValid = await bcrypt.compare(testPassword, finalAdmin.password_hash);
      console.log('\n最終驗證結果:');
      console.log('- 用戶存在:', '是');
      console.log('- 密碼驗證:', isValid ? '通過' : '失敗');
      console.log('- 用戶狀態:', finalAdmin.is_active ? '啟用' : '禁用');
    }
    
  } catch (error) {
    console.error('檢查管理員用戶失敗:', error);
  }
}

// 如果直接運行此腳本
if (require.main === module) {
  checkAndCreateAdmin().then(() => {
    process.exit(0);
  }).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = checkAndCreateAdmin;
