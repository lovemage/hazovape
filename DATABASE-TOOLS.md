# 資料庫工具說明

本專案提供多種資料庫連接和管理工具，解決 Windows 環境下 psql 安裝和使用的問題。

## 🎯 解決的問題

1. **psql 命令找不到** - 使用 Docker 提供 PostgreSQL 客戶端工具
2. **本地/生產環境差異** - 自動檢測並適配不同環境
3. **資料庫連接複雜** - 提供統一的連接介面
4. **重複的環境配置** - 一次配置，多處使用

## 🛠️ 可用工具

### 1. 簡化 psql 工具 (`psql.bat`)

**用途**: 使用 Docker 提供 psql 功能，無需本地安裝 PostgreSQL

```cmd
# 顯示版本
psql.bat --version

# 連接到資料庫
psql.bat "postgresql://user:pass@host:port/db"

# 快速連接 Heroku
psql.bat heroku hazo-vape
```

### 2. Node.js 資料庫連接工具 (`backend/scripts/db-connect.js`)

**用途**: 統一的資料庫操作介面，自動適配本地/生產環境

```cmd
# 顯示連接資訊
node scripts/db-connect.js info

# 測試連接
node scripts/db-connect.js test

# 執行查詢
node scripts/db-connect.js query "SELECT COUNT(*) FROM orders"

# 列出所有表
node scripts/db-connect.js tables

# 查看表結構
node scripts/db-connect.js columns orders
```

### 3. 資料庫修復腳本

**用途**: 修復生產環境的資料庫結構問題

- `scripts/fix-duplicate-order-numbers.js` - 修復重複訂單號
- `scripts/fix-heroku-orders-table.js` - 添加缺少的欄位

## 🔧 環境檢測邏輯

工具會自動檢測運行環境：

- **有 `DATABASE_URL` 環境變數** → 使用 PostgreSQL (通常是 Heroku)
- **沒有 `DATABASE_URL`** → 使用本地 SQLite

## 📋 常見使用場景

### 場景 1: 檢查生產環境資料庫

```cmd
# 方法 1: 使用 psql.bat
psql.bat heroku hazo-vape

# 方法 2: 使用 Node.js 工具 (需要設定 DATABASE_URL)
set DATABASE_URL=your_heroku_database_url
node scripts/db-connect.js info
```

### 場景 2: 本地開發調試

```cmd
# 在 backend 目錄下
node scripts/db-connect.js tables
node scripts/db-connect.js query "SELECT * FROM products LIMIT 5"
```

### 場景 3: 修復資料庫問題

```cmd
# 連接到 Heroku 並執行修復
heroku run bash -a hazo-vape
# 在 Heroku bash 中
node -e "/* 修復腳本 */"
```

## 🚀 AI Agent 使用指南

當 AI Agent 需要連接資料庫時，建議使用以下順序：

1. **優先使用 Node.js 工具**: `node scripts/db-connect.js`
2. **需要 psql 時使用**: `psql.bat heroku app-name`
3. **避免直接使用**: `psql` 或 `heroku pg:psql`

### AI Agent 常用命令模板

```cmd
# 檢查資料庫狀態
node scripts/db-connect.js info

# 查看表結構
node scripts/db-connect.js columns table_name

# 執行查詢
node scripts/db-connect.js query "SQL_STATEMENT"

# 連接 Heroku (如果需要互動式操作)
psql.bat heroku hazo-vape
```

## 🔍 故障排除

### Docker 相關問題

```cmd
# 檢查 Docker 狀態
docker --version
docker ps

# 如果 Docker 未運行
# 啟動 Docker Desktop
```

### 權限問題

```cmd
# 檢查 Heroku 登入狀態
heroku auth:whoami

# 重新登入
heroku login
```

### 資料庫連接問題

```cmd
# 測試本地連接
node scripts/db-connect.js test

# 檢查環境變數
echo %DATABASE_URL%
```

## 📝 注意事項

1. **Docker 必須運行**: 所有 Docker 工具都需要 Docker Desktop 運行
2. **Heroku CLI 必須安裝**: Heroku 相關功能需要 Heroku CLI
3. **環境變數**: 生產環境操作需要正確的 DATABASE_URL
4. **權限**: 確保有足夠權限訪問目標 Heroku 應用

## 🎉 優勢

- ✅ **無需安裝 PostgreSQL**: 使用 Docker 提供所有功能
- ✅ **環境自適應**: 自動檢測並適配不同環境
- ✅ **統一介面**: 一套工具處理所有資料庫操作
- ✅ **錯誤處理**: 完善的錯誤提示和故障排除
- ✅ **AI 友好**: 專為 AI Agent 設計的命令結構
