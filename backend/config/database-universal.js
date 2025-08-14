// 通用數據庫配置 - 自動檢測使用 PostgreSQL 或 SQLite
const fs = require('fs');
const path = require('path');

let dbInstance;

async function initializeDatabase() {
  if (process.env.DATABASE_URL) {
    // 如果有 DATABASE_URL 環境變數，使用 PostgreSQL
    console.log('🗄️  檢測到 DATABASE_URL，使用 PostgreSQL');
    
    try {
      const { Pool } = require('pg');
      
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? {
          rejectUnauthorized: false
        } : false
      });

      // 測試連接
      await pool.query('SELECT NOW()');
      console.log('✅ PostgreSQL 連接成功');

      // 執行數據庫初始化
      const { initializePostgreSQL } = require('../scripts/migrate-to-pg');
      await initializePostgreSQL();

      // PostgreSQL 數據庫操作封裝
      dbInstance = {
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

    } catch (error) {
      console.error('❌ PostgreSQL 初始化失敗，回退到 SQLite:', error.message);
      // 回退到 SQLite
      dbInstance = require('./database');
    }
  } else {
    // 沒有 DATABASE_URL，使用 SQLite
    console.log('🗄️  未檢測到 DATABASE_URL，使用 SQLite');
    dbInstance = require('./database');
  }

  return dbInstance;
}

module.exports = initializeDatabase;