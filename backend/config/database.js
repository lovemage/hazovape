// 檢查是否有 DATABASE_URL（PostgreSQL）
if (process.env.DATABASE_URL) {
  console.log('🗄️  檢測到 DATABASE_URL，使用 PostgreSQL');
  
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false
    } : false
  });

  // PostgreSQL 數據庫操作封裝
  const Database = {
    async run(sql, params = []) {
      try {
        let convertedSql = sql;
        let paramIndex = 1;
        convertedSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
        
        const result = await pool.query(convertedSql, params);
        
        return {
          id: result.rows.length > 0 && result.rows[0].id ? result.rows[0].id : null,
          changes: result.rowCount
        };
      } catch (error) {
        console.error('❌ PostgreSQL 執行失敗:', error.message, 'SQL:', sql);
        throw error;
      }
    },

    async get(sql, params = []) {
      try {
        let convertedSql = sql;
        let paramIndex = 1;
        convertedSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
        
        const result = await pool.query(convertedSql, params);
        return result.rows[0] || null;
      } catch (error) {
        console.error('❌ PostgreSQL 查詢失敗:', error.message, 'SQL:', sql);
        throw error;
      }
    },

    async all(sql, params = []) {
      try {
        let convertedSql = sql;
        let paramIndex = 1;
        convertedSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
        
        const result = await pool.query(convertedSql, params);
        return result.rows;
      } catch (error) {
        console.error('❌ PostgreSQL 查詢失敗:', error.message, 'SQL:', sql);
        throw error;
      }
    },

    async beginTransaction() {
      const client = await pool.connect();
      await client.query('BEGIN');
      return client;
    },

    async commit(client) {
      await client.query('COMMIT');
      client.release();
    },

    async rollback(client) {
      await client.query('ROLLBACK');
      client.release();
    },

    async close() {
      if (pool) {
        await pool.end();
      }
    }
  };

  module.exports = Database;
} else {
  console.log('🗄️  未檢測到 DATABASE_URL，使用 SQLite');
  
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const fs = require('fs');

// 動態數據庫路徑配置 - Heroku 環境適配
const isProduction = process.env.NODE_ENV === 'production';
const dbDir = process.env.DATABASE_PATH
  ? path.dirname(process.env.DATABASE_PATH)
  : isProduction
    ? path.join(__dirname, '../data')  // Heroku 生產環境
    : path.join(__dirname, '../data');  // 本地環境

// 確保數據庫目錄存在
if (!fs.existsSync(dbDir)) {
  try {
  fs.mkdirSync(dbDir, { recursive: true });
    console.log('✅ 創建數據庫目錄:', dbDir);
  } catch (error) {
    console.error('❌ 無法創建數據庫目錄:', error.message);
    // 如果創建失敗，使用當前目錄下的 data 作為備用
    const fallbackDir = path.join(__dirname, '../data');
    if (!fs.existsSync(fallbackDir)) {
      fs.mkdirSync(fallbackDir, { recursive: true });
    }
    console.log('🔄 使用備用目錄:', fallbackDir);
  }
}

// 數據庫文件路徑
const dbPath = process.env.DATABASE_PATH || path.join(dbDir, 'mistmall.db');

// 統一的數據庫文件名定義
const dbFileName = 'mistmall.db';

// Heroku 首次部署：初始化數據庫
if (process.env.NODE_ENV === 'production') {
  // 如果數據庫文件不存在，將由 SQLite 自動創建
  if (!fs.existsSync(dbPath)) {
    console.log('📋 首次部署，將創建新的數據庫文件...');
    console.log('✅ 將由 SQLite 自動創建數據庫文件');
  } else {
    console.log('✅ 數據庫文件已存在');
  }
}

console.log('🗄️  數據庫路徑:', dbPath);
console.log('🌍 環境:', process.env.NODE_ENV || 'development');
console.log('📄 數據庫文件名:', path.basename(dbPath));
console.log('📁 數據庫目錄存在:', fs.existsSync(dbDir));
console.log('📄 數據庫文件存在:', fs.existsSync(dbPath));

if (process.env.NODE_ENV !== 'production') {
  console.log('🔧 開發環境：使用本地數據庫');
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
}
