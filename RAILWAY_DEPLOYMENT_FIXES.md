# Railway 部署修復總結

## 🔧 已解決的問題

### 1. pnpm lockfile 同步問題
**錯誤**: `Cannot install with "frozen-lockfile" because pnpm-lock.yaml is not up to date`

**解決方案**:
- ✅ 從根目錄 `package.json` 移除後端依賴項 (`bcrypt`, `sqlite3`)
- ✅ 重新生成 `pnpm-lock.yaml`
- ✅ 刪除空的 `pnpm-workspace.yaml` 文件

### 2. Docker 構建衝突問題
**錯誤**: `cannot copy to non-directory: /var/lib/buildkit/runc-overlayfs/cachemounts/.../node_modules`

**解決方案**:
- ✅ 創建 `.dockerignore` 文件
- ✅ 排除 `node_modules` 和 `backend/node_modules`
- ✅ 排除構建產物和開發文件

### 3. 數據庫初始化問題
**錯誤**: `SQLITE_ERROR: no such table: orders`

**解決方案**:
- ✅ 修改 `railway-start.js` 確保數據庫初始化在遷移之前
- ✅ 添加完整的數據庫初始化流程
- ✅ 修改遷移腳本先檢查表是否存在
- ✅ 移除對不存在文件的引用

## 📋 部署流程

### Railway 自動化流程
1. **依賴項安裝**: `pnpm install` (只安裝前端依賴項)
2. **前端構建**: `pnpm build` (生成 `dist` 目錄)
3. **文件複製**: `COPY . /app/.` (排除 node_modules)
4. **服務啟動**: `node backend/railway-start.js`

### 啟動時自動執行
1. **檢查後端依賴項**: 自動安裝如果不存在
2. **數據庫初始化**: 如果是首次部署，運行完整初始化
3. **數據庫遷移**: 添加新字段和結構
4. **服務器啟動**: 提供前後端服務

## 🌐 環境變數設定

### Railway Dashboard 必要設定
```bash
NODE_ENV=production
DATABASE_PATH=/app/data/mistmall.db
PORT=3001
JWT_SECRET=mist-mall-production-secret-key-change-this
```

### 管理員賬號 (自動創建)
- **用戶名**: `admin`
- **密碼**: `admin123`

## 📁 文件結構

### 前端 (根目錄)
- `package.json` - 只包含前端依賴項
- `dist/` - 構建產物 (Railway 生成)
- `src/` - 前端源碼

### 後端 (backend/)
- `package.json` - 後端依賴項
- `node_modules/` - 自動安裝
- `server.js` - 主服務器
- `railway-start.js` - 啟動腳本

## 🔍 健康檢查

### API 端點
- `GET /api/health` - 服務健康檢查
- 超時時間: 300 秒
- 重啟策略: 失敗時重啟

### 日誌監控
關鍵日誌訊息：
- `✅ Railway 生產環境啟動成功`
- `✅ 數據庫初始化完成`
- `✅ tracking_number 遷移完成`
- `Mist Mall 後端服務器運行於端口 3001`

## ⚠️ 部署注意事項

### 生產環境安全
1. **修改 JWT_SECRET** 為強密碼
2. **登入後立即修改管理員密碼**
3. **定期更新密碼和密鑰**

### 數據持久化
- 數據庫: `/app/data/mistmall.db`
- 上傳文件: `/app/data/uploads/`
- 建議配置 Railway Volume 進行數據持久化

### 監控要點
- 數據庫文件大小
- 健康檢查響應時間
- 記憶體使用量
- CPU 使用率

## 🚀 部署命令

### 重新部署
```bash
git push origin main
```

### 強制重新構建
在 Railway Dashboard 中點擊 "Deploy" 按鈕

### 查看日誌
在 Railway Dashboard 的 "Deployments" 頁面查看實時日誌

## 📞 故障排除

### 常見問題
1. **數據庫連接失敗**: 檢查 DATABASE_PATH 環境變數
2. **管理員登入失敗**: 確認數據庫初始化完成
3. **前端無法訪問**: 檢查靜態文件服務配置
4. **API 請求失敗**: 確認後端服務正常運行

### 緊急重置
如果需要重置數據庫：
1. 刪除 Railway Volume 中的數據庫文件
2. 重新部署應用
3. 系統會自動重新初始化 