@echo off
echo ========================================
echo PostgreSQL 客戶端工具安裝
echo ========================================
echo.

REM 檢查管理員權限
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo 請以管理員身份運行此批次檔
    echo 右鍵點擊 -> "以系統管理員身分執行"
    pause
    exit /b 1
)

echo 管理員權限確認
echo.

REM 檢查 psql 是否已安裝
psql --version >nul 2>&1
if %errorlevel% equ 0 (
    echo psql 已安裝
    psql --version
    pause
    exit /b 0
)

echo psql 未安裝，開始安裝程序...
echo.

REM 檢查 Chocolatey
choco --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 安裝 Chocolatey...
    powershell -Command "Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))"
    
    if %errorlevel% neq 0 (
        echo Chocolatey 安裝失敗
        echo 請手動安裝 PostgreSQL: https://www.postgresql.org/download/windows/
        start https://www.postgresql.org/download/windows/
        pause
        exit /b 1
    )
    
    echo Chocolatey 安裝成功
    call refreshenv
) else (
    echo Chocolatey 已安裝
)

echo.
echo 安裝 PostgreSQL...
choco install postgresql -y

if %errorlevel% neq 0 (
    echo PostgreSQL 安裝失敗
    echo 請手動安裝: https://www.postgresql.org/download/windows/
    start https://www.postgresql.org/download/windows/
    pause
    exit /b 1
)

echo PostgreSQL 安裝成功
call refreshenv

echo.
echo 測試 psql 安裝...
timeout /t 3 /nobreak >nul

psql --version
if %errorlevel% neq 0 (
    echo psql 命令未在 PATH 中
    echo 可能需要重新啟動命令提示字元或電腦
    echo.
    echo 或手動添加 PostgreSQL bin 目錄到 PATH:
    echo C:\Program Files\PostgreSQL\[版本]\bin
) else (
    echo psql 安裝成功！
)

echo.
echo 安裝完成！
echo.
echo 使用方法:
echo   psql --version
echo   psql "postgresql://user:pass@host:port/db"
echo   heroku pg:psql -a app-name
echo.

pause
