# Mist Mall - 茶葉商城系統

一個現代化的茶葉電商平台，提供完整的商品展示、訂單管理和後台管理功能。

## 🌟 系統特色

- **現代化設計**：基於 React + TypeScript 的響應式前端界面
- **完整電商功能**：商品展示、購物車、訂單管理、支付流程
- **智能通知**：Telegram Bot 自動訂單通知
- **強大後台**：完整的管理員後台系統
- **數據導出**：Excel 格式訂單數據導出
- **多件優惠**：靈活的批量購買優惠設置

## 🏗️ 技術架構

### 前端技術棧
- **React 18** - 現代化前端框架
- **TypeScript** - 類型安全的 JavaScript
- **Vite** - 快速的構建工具
- **Tailwind CSS** - 實用優先的 CSS 框架
- **Lucide React** - 現代化圖標庫
- **Sonner** - 優雅的通知組件

### 後端技術棧
- **Node.js** - JavaScript 運行環境
- **Express.js** - Web 應用框架
- **SQLite** - 輕量級數據庫
- **JWT** - 身份驗證
- **Bcrypt** - 密碼加密
- **Multer** - 文件上傳處理
- **XLSX** - Excel 文件處理
- **node-telegram-bot-api** - Telegram 機器人集成

## 📁 項目結構

```
mist-mall/
├── src/                     # 前端應用
│   ├── components/          # React 組件
│   ├── pages/              # 頁面組件
│   ├── contexts/           # React Context
│   ├── services/           # API 服務
│   └── types/              # TypeScript 類型定義
├── public/                 # 靜態資源
├── backend/                # 後端應用
│   ├── routes/             # API 路由
│   ├── config/             # 配置文件
│   ├── scripts/            # 工具腳本
│   └── data/               # 數據庫文件
└── README.md
```

## 🚀 快速開始

### 環境要求
- Node.js 16.0 或更高版本
- npm 或 yarn 包管理器

### 安裝步驟

1. **克隆項目**
```bash
git clone <repository-url>
cd mist-mall
```

2. **安裝前端依賴**
```bash
npm install
```

3. **安裝後端依賴**
```bash
cd backend
npm install
```

4. **初始化數據庫**
```bash
npm run init-db
```

5. **啟動後端服務**
```bash
npm start
# 服務運行在 http://localhost:3001
```

6. **啟動前端服務**
```bash
cd ..
npm run dev
# 服務運行在 http://localhost:5173
```

### 默認管理員賬號
- **用戶名**: admin
- **密碼**: admin123

## 🛍️ 用戶功能

### 商品瀏覽
- **商品列表**：展示所有可用商品
- **商品詳情**：查看商品詳細信息、價格、庫存
- **多件優惠**：自動計算批量購買折扣
- **商品圖片**：支持多張商品圖片展示

### 購物流程
- **口味選擇**：為每個商品選擇多種口味
- **購物車管理**：添加、修改、刪除商品
- **價格計算**：實時計算總價和優惠金額
- **訂單提交**：填寫客戶信息和店號

### 訂單管理
- **訂單確認**：顯示訂單詳情和驗證碼
- **訂單驗證**：使用訂單號和驗證碼查詢訂單
- **狀態追蹤**：查看訂單處理狀態

### 公告系統
- **公告展示**：首頁顯示重要公告
- **優先級排序**：按重要程度排列公告

## 🔧 管理員功能

### 商品管理
- **商品列表**：查看所有商品（包含停用商品）
- **新增商品**：創建新商品，設置價格、庫存、圖片
- **編輯商品**：修改商品信息、價格、庫存
- **多件優惠設置**：配置批量購買折扣規則
- **商品狀態管理**：啟用/停用商品
- **圖片管理**：上傳、刪除商品圖片（最多5張）

### 口味管理
- **口味列表**：管理所有茶葉口味
- **新增口味**：添加新的茶葉口味
- **編輯口味**：修改口味名稱和排序
- **排序管理**：調整口味顯示順序
- **狀態管理**：啟用/停用口味

### 訂單管理
- **訂單列表**：查看所有訂單
- **訂單搜索**：按訂單號、客戶姓名、電話搜索
- **狀態篩選**：按訂單狀態篩選（待確認、已確認、處理中、已出貨、已送達、已取消）
- **狀態更新**：修改訂單處理狀態
- **訂單詳情**：查看完整訂單信息
- **批量導出**：選擇訂單導出為 Excel 文件
- **重發通知**：手動重新發送 Telegram 通知

### 公告管理
- **公告列表**：管理所有系統公告
- **新增公告**：創建新公告
- **編輯公告**：修改公告內容
- **優先級設置**：設置公告重要程度（1-10級）
- **狀態管理**：啟用/停用公告

### 系統設置
- **Telegram 配置**：設置 Bot Token 和 Chat ID
- **通知開關**：啟用/停用自動通知
- **連接測試**：測試 Telegram Bot 連接狀態

## 📊 數據管理

### 數據庫結構
系統使用 SQLite 數據庫，包含以下主要表：

- **products** - 商品信息
- **flavors** - 茶葉口味
- **orders** - 訂單主表
- **order_items** - 訂單商品詳情
- **announcements** - 系統公告
- **admin_users** - 管理員用戶
- **system_settings** - 系統配置

### 數據導出
- **Excel 格式**：支持將訂單數據導出為 Excel 文件
- **文件命名**：DOC{年}{日}{月}.xlsx 格式
- **完整信息**：包含訂單號、客戶信息、商品詳情、金額等
- **批量選擇**：可選擇特定訂單進行導出

## 🔔 通知系統

### Telegram Bot 集成
- **自動通知**：新訂單自動發送 Telegram 通知
- **通知內容**：包含完整訂單信息
  - 📋 訂單號
  - 👤 客戶姓名和電話
  - 🏪 店號
  - 💰 總金額
  - 🕐 下單時間
  - 📦 商品詳情（含口味）
  - 🔑 驗證碼

### 通知管理
- **配置靈活**：可隨時更新 Bot Token 和 Chat ID
- **開關控制**：可啟用/停用通知功能
- **手動重發**：支持手動重新發送通知
- **錯誤處理**：通知失敗不影響訂單創建

## 💰 價格系統

### 整數金額
- **無小數點**：所有金額均為整數顯示
- **自動四捨五入**：計算結果自動四捨五入到整數
- **一致性**：前端顯示、後端計算、數據庫存儲均為整數

### 多件優惠
- **靈活配置**：可設置不同數量的折扣規則
- **自動計算**：購物車自動應用最優折扣
- **實時顯示**：即時顯示原價、優惠價、節省金額

## 🔌 API 文檔

### 用戶端 API
- `GET /api/products` - 獲取商品列表
- `GET /api/products/:id` - 獲取商品詳情
- `GET /api/flavors` - 獲取口味列表
- `GET /api/announcements` - 獲取公告列表
- `POST /api/orders` - 創建訂單
- `POST /api/orders/verify` - 驗證訂單

### 管理端 API
- `POST /api/auth/admin/login` - 管理員登入
- `GET /api/admin/dashboard` - 儀表板數據
- `GET /api/admin/settings` - 獲取系統設置
- `PUT /api/admin/settings` - 更新系統設置

#### 商品管理
- `GET /api/products/admin/all` - 獲取所有商品
- `POST /api/products/admin` - 創建商品
- `PUT /api/products/admin/:id` - 更新商品
- `DELETE /api/products/admin/:id` - 停用商品
- `PUT /api/products/admin/:id/restore` - 恢復商品

#### 口味管理
- `GET /api/flavors/admin/all` - 獲取所有口味
- `POST /api/flavors/admin` - 創建口味
- `PUT /api/flavors/admin/:id` - 更新口味
- `DELETE /api/flavors/admin/:id` - 停用口味
- `PUT /api/flavors/admin/:id/restore` - 恢復口味

#### 訂單管理
- `GET /api/orders/admin/all` - 獲取所有訂單
- `PUT /api/orders/admin/:id/status` - 更新訂單狀態
- `POST /api/orders/admin/export` - 導出訂單
- `POST /api/orders/admin/:id/resend-telegram` - 重發通知

#### 公告管理
- `GET /api/announcements/admin/all` - 獲取所有公告
- `POST /api/announcements/admin` - 創建公告
- `PUT /api/announcements/admin/:id` - 更新公告
- `DELETE /api/announcements/admin/:id` - 停用公告
- `PUT /api/announcements/admin/:id/restore` - 恢復公告

## 🚀 部署說明

### 生產環境部署

1. **構建前端**
```bash
npm run build
```

2. **配置環境變量**
```bash
# backend/.env
PORT=3001
FRONTEND_URL=https://your-domain.com
JWT_SECRET=your-jwt-secret
```

3. **啟動後端服務**
```bash
cd backend
npm start
```

4. **配置反向代理**
使用 Nginx 或其他 Web 服務器配置反向代理

### Docker 部署
```dockerfile
# 可根據需要創建 Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

## 🛠️ 開發說明

### 開發工具
- **ESLint** - 代碼檢查
- **Prettier** - 代碼格式化
- **TypeScript** - 類型檢查

### 代碼結構
- **組件化設計**：可重用的 React 組件
- **類型安全**：完整的 TypeScript 類型定義
- **API 封裝**：統一的 API 調用服務
- **狀態管理**：React Context 進行狀態管理

## 📝 更新日志

### v1.0.0 (2025-06-24)
- ✅ 完整的電商功能實現
- ✅ 管理員後台系統
- ✅ Telegram Bot 通知集成
- ✅ Excel 數據導出功能
- ✅ 多件優惠系統
- ✅ 整數金額系統
- ✅ 響應式設計

## 📞 技術支持

如有問題或建議，請聯繫開發團隊。

## 📄 許可證

本項目採用 MIT 許可證。
