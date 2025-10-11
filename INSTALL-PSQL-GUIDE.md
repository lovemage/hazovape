# PostgreSQL 客戶端工具安裝指南

## 🎯 目標
在 Windows 系統上安裝 `psql` 命令，解決 "psql command could not be located" 錯誤。

## 🚀 方法 1: 使用 Chocolatey（推薦）

### 步驟 1: 以管理員身份打開 PowerShell
1. 按 `Win + X`
2. 選擇 "Windows PowerShell (管理員)" 或 "終端機 (管理員)"

### 步驟 2: 安裝 Chocolatey（如果尚未安裝）
```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

### 步驟 3: 安裝 PostgreSQL
```powershell
choco install postgresql -y
```

### 步驟 4: 重新啟動命令提示字元並測試
```cmd
psql --version
```

## 🔧 方法 2: 官方安裝程式

### 步驟 1: 下載安裝程式
訪問：https://www.postgresql.org/download/windows/

### 步驟 2: 運行安裝程式
1. 下載 PostgreSQL 安裝程式
2. 運行安裝程式
3. 在組件選擇頁面，確保勾選 "Command Line Tools"
4. 完成安裝

### 步驟 3: 驗證安裝
```cmd
psql --version
```

## 🐳 方法 3: 繼續使用 Docker（已配置）

如果上述方法都有問題，你可以繼續使用我們已經配置好的 Docker 方案：

```cmd
# 使用 Docker psql
psql.bat --version
psql.bat heroku hazo-vape

# 使用 Node.js 資料庫工具
cd backend
node scripts/db-connect.js info
node scripts/db-connect.js query "SELECT COUNT(*) FROM orders"
```

## 🧪 測試安裝

安裝完成後，測試以下命令：

```cmd
# 檢查版本
psql --version

# 連接到 Heroku（需要先登入 heroku login）
heroku pg:psql -a hazo-vape

# 或使用我們的工具
psql.bat heroku hazo-vape
```

## 🔍 故障排除

### 問題 1: "psql 不是內部或外部命令"
**解決方案:**
1. 重新啟動命令提示字元
2. 重新啟動電腦
3. 檢查 PATH 環境變數是否包含 PostgreSQL bin 目錄

### 問題 2: Chocolatey 安裝失敗
**解決方案:**
1. 確保以管理員身份運行
2. 檢查網路連接
3. 使用官方安裝程式作為替代方案

### 問題 3: 權限問題
**解決方案:**
1. 確保以管理員身份運行所有安裝命令
2. 檢查防毒軟體是否阻擋安裝

## 📋 手動執行命令

如果自動腳本有問題，請手動執行以下命令：

### 在管理員 PowerShell 中：
```powershell
# 檢查 Chocolatey
if (Get-Command choco -ErrorAction SilentlyContinue) {
    Write-Host "Chocolatey already installed"
} else {
    Write-Host "Installing Chocolatey..."
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
}

# 安裝 PostgreSQL
choco install postgresql -y

# 測試
psql --version
```

## 🎉 完成後的好處

安裝完成後，你將能夠：

1. ✅ 直接使用 `psql` 命令
2. ✅ 使用 `heroku pg:psql` 命令
3. ✅ 執行所有 PostgreSQL 客戶端工具
4. ✅ 不再依賴 Docker 進行基本資料庫操作

## 💡 建議

- **開發環境**: 安裝本地 PostgreSQL 客戶端工具
- **臨時使用**: 使用 Docker 方案（psql.bat）
- **生產環境**: 使用 Heroku CLI 配合本地 psql

選擇最適合你需求的方案！
