# Railway Volume 永久存儲設置指南

## 🗄️ 什麼是 Railway Volume？

Railway Volume 是持久化存儲解決方案，確保數據在容器重啟和重新部署時不會丟失。

## 📋 設置步驟

### 1. 登入 Railway Dashboard
前往：https://railway.app/dashboard

### 2. 選擇您的專案
找到並點擊 `vjvape` 專案

### 3. 進入服務設置
1. 點擊您的服務（通常是 main 或專案名稱）
2. 點擊 **Settings** 標籤

### 4. 添加 Volume
1. 滾動到 **Volumes** 部分
2. 點擊 **+ Add Volume**
3. 設置以下參數：

```
Mount Path: /app/data
Size: 1GB (可根據需要調整)
Name: vjvape-data-volume
```

### 5. 設置環境變數
在 **Variables** 標籤中確保以下設置：

```bash
# 數據庫路徑（指向 Volume）
DATABASE_PATH=/app/data/mistmall.db

# 上傳文件路徑（指向 Volume）  
UPLOADS_PATH=/app/data/uploads

# 其他必要變數
NODE_ENV=production
PORT=3001
JWT_SECRET=your-secure-jwt-secret-key
```

### 6. 重新部署
1. 點擊 **Deployments** 標籤
2. 點擊 **Deploy** 或推送新的 commit 觸發部署

## ✅ 驗證 Volume 工作正常

部署完成後，檢查日誌應該看到：
```
✅ 創建數據庫目錄: /app/data
📄 數據庫文件存在: true (重新部署後)
📁 靜態文件服務路徑: /app/data/uploads
```

## 📊 Volume 結構

```
/app/data/
├── mistmall.db          # 主數據庫文件
├── mistmall.db-shm      # SQLite 共享內存文件
├── mistmall.db-wal      # SQLite WAL 文件
└── uploads/             # 上傳文件目錄
    ├── products/        # 商品圖片
    ├── static/          # 靜態文件
    └── upsell/          # 加購商品圖片
```

## 🔄 數據遷移注意事項

1. **首次設置 Volume**：數據庫會自動初始化
2. **現有專案添加 Volume**：可能需要手動遷移數據
3. **Volume 大小**：建議至少 1GB，可根據圖片數量調整

## 🚨 重要提醒

- Volume 設置後，數據將持久化保存
- 刪除 Volume 會永久丟失所有數據
- 建議定期備份重要數據
- Volume 費用按實際使用空間計算 