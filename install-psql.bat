@echo off
REM PostgreSQL 客戶端工具安裝腳本

echo ========================================
echo PostgreSQL 客戶端工具安裝腳本
echo ========================================
echo.

REM 檢查是否以管理員身份運行
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 請以管理員身份運行此腳本
    echo 右鍵點擊 -> "以系統管理員身分執行"
    pause
    exit /b 1
)

echo ✅ 管理員權限確認

REM 檢查 Chocolatey 是否已安裝
choco --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 📦 安裝 Chocolatey 包管理器...
    powershell -Command "Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))"
    
    if %errorlevel% neq 0 (
        echo ❌ Chocolatey 安裝失敗
        goto :manual_install
    )
    
    echo ✅ Chocolatey 安裝成功
    
    REM 重新載入環境變數
    call refreshenv
) else (
    echo ✅ Chocolatey 已安裝
)

echo.
echo 📦 安裝 PostgreSQL 客戶端工具...
choco install postgresql --params "/Password:postgres" -y

if %errorlevel% neq 0 (
    echo ❌ PostgreSQL 安裝失敗，嘗試手動安裝方式
    goto :manual_install
)

echo ✅ PostgreSQL 安裝成功

REM 重新載入環境變數
call refreshenv

echo.
echo 🧪 測試 psql 安裝...
psql --version
if %errorlevel% neq 0 (
    echo ⚠️ psql 命令未在 PATH 中，可能需要重新啟動命令提示字元
    echo 或手動添加到 PATH: C:\Program Files\PostgreSQL\[版本]\bin
) else (
    echo ✅ psql 安裝並配置成功！
)

echo.
echo 🎉 安裝完成！
echo.
echo 📋 使用方法:
echo   psql --version
echo   psql "postgresql://user:pass@host:port/db"
echo.
echo 🔧 如果 psql 命令仍然找不到，請：
echo   1. 重新啟動命令提示字元
echo   2. 或重新啟動電腦
echo   3. 或手動添加 PostgreSQL bin 目錄到 PATH
echo.
pause
exit /b 0

:manual_install
echo.
echo 📋 手動安裝指南:
echo.
echo 1. 訪問: https://www.postgresql.org/download/windows/
echo 2. 下載 PostgreSQL 安裝程式
echo 3. 運行安裝程式，選擇安裝組件時確保勾選 "Command Line Tools"
echo 4. 安裝完成後，PostgreSQL bin 目錄會自動添加到 PATH
echo.
echo 💡 或者繼續使用我們之前創建的 Docker 方案:
echo   psql.bat --version
echo   psql.bat heroku hazo-vape
echo.
pause
exit /b 1
