const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// PostgreSQL 連接配置
let pool;

// 初始化 PostgreSQL 連接池
function createPostgreSQLConnection() {
  return new Promise((resolve, reject) => {
    try {
      // Heroku 自動提供 DATABASE_URL 環境變數
      const connectionString = process.env.DATABASE_URL;
      
      if (!connectionString) {
        throw new Error('DATABASE_URL 環境變數未設置');
      }

      pool = new Pool({
        connectionString: connectionString,
        ssl: process.env.NODE_ENV === 'production' ? {
          rejectUnauthorized: false
        } : false
      });

      console.log('✅ PostgreSQL 連接池初始化成功');
      console.log('🗄️  數據庫類型: PostgreSQL');
      console.log('🌍 環境:', process.env.NODE_ENV || 'development');

      // 測試連接
      pool.query('SELECT NOW()', (err, result) => {
        if (err) {
          console.error('❌ PostgreSQL 連接測試失敗:', err.message);
          reject(err);
        } else {
          console.log('✅ PostgreSQL 連接測試成功，時間:', result.rows[0].now);
          resolve(pool);
        }
      });

    } catch (error) {
      console.error('❌ PostgreSQL 連接初始化失敗:', error.message);
      reject(error);
    }
  });
}

// 數據庫操作封裝
const Database = {
  // 執行 SQL 查詢
  async run(sql, params = []) {
    try {
      // 將 SQLite 的 ? 參數佔位符轉換為 PostgreSQL 的 $1, $2, ... 格式
      const pgSql = sql.replace(/\?/g, () => `$${params.length > 0 ? params.indexOf(params[0]) + 1 : 1}`);
      let convertedSql = sql;
      let paramIndex = 1;
      convertedSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
      
      const result = await pool.query(convertedSql, params);
      
      // 模擬 SQLite 的返回格式
      return {
        id: result.rows.length > 0 && result.rows[0].id ? result.rows[0].id : null,
        changes: result.rowCount
      };
    } catch (error) {
      console.error('❌ PostgreSQL 執行失敗:', error.message, 'SQL:', sql);
      throw error;
    }
  },

  // 獲取單條記錄
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

  // 獲取多條記錄
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

  // 開始事務
  async beginTransaction() {
    const client = await pool.connect();
    await client.query('BEGIN');
    return client;
  },

  // 提交事務
  async commit(client) {
    await client.query('COMMIT');
    client.release();
  },

  // 回滾事務
  async rollback(client) {
    await client.query('ROLLBACK');
    client.release();
  },

  // 關閉連接池
  async close() {
    if (pool) {
      await pool.end();
    }
  }
};

// 根據環境選擇數據庫
let dbInstance;

if (process.env.DATABASE_URL) {
  // 如果有 DATABASE_URL，使用 PostgreSQL
  console.log('🗄️  檢測到 DATABASE_URL，使用 PostgreSQL');
  createPostgreSQLConnection()
    .then(() => {
      dbInstance = Database;
    })
    .catch(err => {
      console.error('❌ PostgreSQL 初始化失敗，回退到 SQLite:', err.message);
      // 回退到 SQLite
      dbInstance = require('./database');
    });
} else {
  // 沒有 DATABASE_URL，使用 SQLite
  console.log('🗄️  未檢測到 DATABASE_URL，使用 SQLite');
  dbInstance = require('./database');
}

module.exports = dbInstance || Database;