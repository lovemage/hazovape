#!/usr/bin/env node

/**
 * 統一的資料庫連接工具
 * 自動檢測環境並提供適當的資料庫連接
 * 解決 psql 依賴問題
 */

const { Pool } = require('pg');
const initializeDatabase = require('../config/database-universal');

class DatabaseConnector {
  constructor() {
    this.pool = null;
    this.db = null;
    this.isHeroku = !!process.env.DATABASE_URL && process.env.DATABASE_URL.includes('postgres://');
    this.isLocal = !this.isHeroku;
  }

  async connect() {
    if (this.isHeroku) {
      console.log('🌐 連接到 Heroku PostgreSQL...');
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
    } else {
      console.log('🏠 連接到本地資料庫...');
      // 初始化資料庫
      this.db = await initializeDatabase();
    }

    try {
      if (this.isHeroku) {
        await this.pool.query('SELECT 1');
      } else {
        await this.db.get('SELECT 1');
      }
      console.log('✅ 資料庫連接成功');
      return true;
    } catch (error) {
      console.error('❌ 資料庫連接失敗:', error.message);
      return false;
    }
  }

  async query(sql, params = []) {
    if (this.isHeroku) {
      const result = await this.pool.query(sql, params);
      return result.rows;
    } else {
      if (sql.toLowerCase().startsWith('select')) {
        return await this.db.all(sql, params);
      } else {
        return await this.db.run(sql, params);
      }
    }
  }

  async get(sql, params = []) {
    if (this.isHeroku) {
      const result = await this.pool.query(sql, params);
      return result.rows[0] || null;
    } else {
      return await this.db.get(sql, params);
    }
  }

  async run(sql, params = []) {
    if (this.isHeroku) {
      return await this.pool.query(sql, params);
    } else {
      return await this.db.run(sql, params);
    }
  }

  async close() {
    if (this.isHeroku && this.pool) {
      await this.pool.end();
      console.log('🔌 資料庫連接已關閉');
    }
  }

  getInfo() {
    return {
      environment: this.isHeroku ? 'Heroku PostgreSQL' : 'Local Database',
      connectionString: this.isHeroku ? process.env.DATABASE_URL?.replace(/:[^:]*@/, ':***@') : 'Local SQLite/PostgreSQL'
    };
  }
}

// 提供便捷的命令行工具
async function runCommand() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command) {
    console.log('📋 資料庫連接工具使用方法:');
    console.log('');
    console.log('  node db-connect.js info                    - 顯示連接資訊');
    console.log('  node db-connect.js test                    - 測試連接');
    console.log('  node db-connect.js query "SQL語句"         - 執行查詢');
    console.log('  node db-connect.js tables                  - 列出所有表');
    console.log('  node db-connect.js columns table_name      - 列出表欄位');
    console.log('');
    console.log('範例:');
    console.log('  node db-connect.js query "SELECT COUNT(*) FROM orders"');
    console.log('  node db-connect.js columns orders');
    return;
  }

  const db = new DatabaseConnector();
  
  try {
    const connected = await db.connect();
    if (!connected) {
      process.exit(1);
    }

    switch (command) {
      case 'info':
        const info = db.getInfo();
        console.log('📊 資料庫資訊:');
        console.log(`環境: ${info.environment}`);
        console.log(`連接: ${info.connectionString}`);
        break;

      case 'test':
        console.log('🧪 測試資料庫連接...');
        const testResult = await db.query('SELECT 1 as test');
        console.log('✅ 連接測試成功:', testResult);
        break;

      case 'query':
        if (!args[1]) {
          console.log('❌ 請提供 SQL 查詢語句');
          break;
        }
        console.log(`🔍 執行查詢: ${args[1]}`);
        const queryResult = await db.query(args[1]);
        console.log('📋 查詢結果:');
        console.table(queryResult);
        break;

      case 'tables':
        console.log('📋 列出所有表...');
        const tables = await db.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          ORDER BY table_name
        `);
        console.table(tables);
        break;

      case 'columns':
        if (!args[1]) {
          console.log('❌ 請提供表名');
          break;
        }
        console.log(`📋 列出表 ${args[1]} 的欄位...`);
        const columns = await db.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = $1 
          ORDER BY ordinal_position
        `, [args[1]]);
        console.table(columns);
        break;

      default:
        console.log(`❌ 未知命令: ${command}`);
    }

  } catch (error) {
    console.error('❌ 執行失敗:', error.message);
    process.exit(1);
  } finally {
    await db.close();
  }
}

// 如果直接執行此腳本
if (require.main === module) {
  runCommand();
}

module.exports = DatabaseConnector;
