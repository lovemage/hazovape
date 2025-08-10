const bcrypt = require('bcrypt');
const Database = require('../config/database');

async function resetAdmin() {
  try {
    console.log('🔑 重設管理員密碼...');
    
    // 檢查是否有管理員用戶
    const existingAdmin = await Database.get('SELECT id FROM admin_users WHERE username = ?', ['admin']);
    
    if (existingAdmin) {
      // 更新現有管理員密碼
      const newPassword = 'admin123';
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      
      await Database.run(
        'UPDATE admin_users SET password_hash = ?, is_active = 1 WHERE username = ?',
        [hashedPassword, 'admin']
      );
      
      console.log('✅ 管理員密碼已重設');
      console.log('🔑 用戶名: admin');
      console.log('🔑 新密碼: admin123');
      
    } else {
      // 創建新管理員
      const newPassword = 'admin123';
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      
      await Database.run(
        'INSERT INTO admin_users (username, password_hash, is_active) VALUES (?, ?, ?)',
        ['admin', hashedPassword, 1]
      );
      
      console.log('✅ 新管理員用戶已創建');
      console.log('🔑 用戶名: admin');
      console.log('🔑 密碼: admin123');
    }
    
    console.log('🎉 管理員重設完成，現在可以使用 admin/admin123 登入');
    
  } catch (error) {
    console.error('❌ 重設管理員失敗:', error);
    process.exit(1);
  }
}

// 如果直接執行此腳本
if (require.main === module) {
  resetAdmin().then(() => {
    console.log('✅ 腳本執行完成');
    process.exit(0);
  }).catch(error => {
    console.error('❌ 腳本執行失敗:', error);
    process.exit(1);
  });
}

module.exports = resetAdmin;