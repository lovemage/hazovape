const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Railway Volume 數據持久化配置
// 確保數據庫目錄存在
const dbDir = process.env.NODE_ENV === 'production'
  ? '/app/data'  // Railway Volume 路徑
  : path.join(__dirname, '../data');  // 本地開發路徑

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// 統一使用 mistmall.db，不分環境
const dbFileName = 'mistmall.db';
const dbPath = path.join(dbDir, dbFileName);

// Railway 首次部署：從部署包複製初始數據到 Volume
if (process.env.NODE_ENV === 'production') {
  const volumeDbPath = path.join('/app/data', dbFileName);
  const sourceDbPath = path.join(__dirname, '../data', dbFileName);

  // 如果 Volume 中沒有數據庫文件，創建一個空的數據庫讓 SQLite 初始化
  if (!fs.existsSync(volumeDbPath)) {
    console.log('📋 首次部署，創建新的數據庫文件...');
    try {
      // 不創建空文件，讓 SQLite 自動創建和初始化
      console.log('✅ 將由 SQLite 自動創建數據庫文件');
    } catch (error) {
      console.error('❌ 數據庫準備失敗:', error.message);
    }
  } else {
    console.log('✅ 數據庫文件已存在於 Volume 中');
  }
}

console.log('🗄️  數據庫路徑:', dbPath);
console.log('🌍 環境:', process.env.NODE_ENV || 'development');
console.log('📄 數據庫文件名:', dbFileName);
console.log('📁 數據庫目錄存在:', fs.existsSync(dbDir));
console.log('📄 數據庫文件存在:', fs.existsSync(dbPath));

if (process.env.NODE_ENV !== 'production') {
  console.log('🔧 開發環境：使用獨立的本地數據庫，不影響 Railway 生產數據');
}

// 數據庫連接管理
let db;

function createDatabaseConnection() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ 數據庫連接失敗:', err.message);
        reject(err);
      } else {
        console.log('✅ 成功連接到 SQLite 數據庫');

        // 啟用外鍵約束
        db.run('PRAGMA foreign_keys = ON', (err) => {
          if (err) {
            console.error('❌ 啟用外鍵約束失敗:', err.message);
          } else {
            console.log('✅ 外鍵約束已啟用');
          }
        });

        // 設置數據庫配置
        db.run('PRAGMA journal_mode = WAL', (err) => {
          if (err) {
            console.error('❌ 設置 WAL 模式失敗:', err.message);
          } else {
            console.log('✅ WAL 模式已啟用');
          }
        });

        console.log('✅ 數據庫連接成功，準備就緒');
        resolve(db);
      }
    });

    // 監聽數據庫錯誤
    db.on('error', (err) => {
      console.error('❌ 數據庫錯誤:', err.message);
    });

    // 監聽數據庫關閉
    db.on('close', () => {
      console.log('⚠️  數據庫連接已關閉');
    });
  });
}

// 初始化數據庫連接
createDatabaseConnection().catch(err => {
  console.error('❌ 初始化數據庫連接失敗:', err);
  process.exit(1);
});

// 表初始化函數已移除，避免任何可能的衝突

// 檢查數據庫連接狀態並自動重連
async function checkDatabaseConnection() {
  if (!db || db.open === false) {
    console.log('⚠️  數據庫連接已關閉，嘗試重新連接...');
    try {
      await createDatabaseConnection();
      console.log('✅ 數據庫重新連接成功');
    } catch (error) {
      console.error('❌ 數據庫重新連接失敗:', error.message);
      throw new Error('Database reconnection failed');
    }
  }
}

// 數據庫操作封裝
const Database = {
  // 執行 SQL 查詢
  async run(sql, params = []) {
    try {
      await checkDatabaseConnection();
      return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
          if (err) {
            console.error('❌ SQL 執行失敗:', err.message, 'SQL:', sql);
            reject(err);
          } else {
            resolve({ id: this.lastID, changes: this.changes });
          }
        });
      });
    } catch (error) {
      throw error;
    }
  },

  // 獲取單條記錄
  async get(sql, params = []) {
    try {
      await checkDatabaseConnection();
      return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
          if (err) {
            console.error('❌ SQL 查詢失敗:', err.message, 'SQL:', sql);
            reject(err);
          } else {
            resolve(row);
          }
        });
      });
    } catch (error) {
      throw error;
    }
  },

  // 獲取多條記錄
  async all(sql, params = []) {
    try {
      await checkDatabaseConnection();
      return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
          if (err) {
            console.error('❌ SQL 查詢失敗:', err.message, 'SQL:', sql);
            reject(err);
          } else {
            resolve(rows);
          }
        });
      });
    } catch (error) {
      throw error;
    }
  },

  // 開始事務
  beginTransaction() {
    return this.run('BEGIN TRANSACTION');
  },

  // 提交事務
  commit() {
    return this.run('COMMIT');
  },

  // 回滾事務
  rollback() {
    return this.run('ROLLBACK');
  },

  // 關閉數據庫連接
  close() {
    return new Promise((resolve, reject) => {
      db.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
};

module.exports = Database;
