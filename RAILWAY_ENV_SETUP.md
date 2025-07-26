# Railway 環境變數設定指南

## 必要環境變數

在 Railway Dashboard 中設定以下環境變數：

### 基本設定
- `NODE_ENV` = `production`
- `DATABASE_PATH` = `/app/data/mistmall.db`
- `PORT` = `3001`

### JWT 安全性設定
- `JWT_SECRET` = `mist-mall-production-secret-key-change-this`

### 管理員賬號（預設）
系統會自動初始化以下管理員賬號：
- **用戶名**: `admin`
- **密碼**: `admin123`

### 可選設定（如需要）
- `RAILWAY_ENVIRONMENT` = `production` (自動設定)
- `RAILWAY_PROJECT_ID` = (自動設定)

## 設定步驟

1. 登入 Railway Dashboard
2. 選擇您的專案
3. 進入 "Variables" 頁面
4. 添加上述環境變數
5. 重新部署服務

## 管理員登入
部署完成後，可使用以下憑證登入管理後台：
- URL: `https://your-domain.railway.app/admin`
- 用戶名: `admin`
- 密碼: `admin123`

## 安全提醒
⚠️ **生產環境請務必修改以下設定**：
1. 更改 JWT_SECRET 為強密碼
2. 登入後立即修改管理員密碼
3. 定期更新密碼和密鑰

## 數據庫初始化
系統會自動執行以下初始化：
- 創建數據庫表結構
- 初始化管理員賬號
- 設定基本配置
- 創建示例數據

## 健康檢查
- 健康檢查端點: `/api/health`
- 超時時間: 300 秒 