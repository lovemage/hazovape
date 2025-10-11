@echo off
REM Heroku PostgreSQL 連接腳本 - 使用 Docker
REM 解決 "psql command could not be located" 問題

setlocal enabledelayedexpansion

REM 檢查參數
if "%~1"=="" (
    echo ❌ 請提供 Heroku 應用名稱
    echo.
    echo 使用方法:
    echo   heroku-psql.bat app-name
    echo   heroku-psql.bat app-name "SELECT * FROM orders LIMIT 5;"
    echo.
    exit /b 1
)

set APP_NAME=%1
set SQL_COMMAND=%2

REM 檢查 Docker 是否運行
docker version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker 未運行或未安裝
    echo 請確保 Docker Desktop 正在運行
    exit /b 1
)

REM 檢查 Heroku CLI 是否安裝
heroku --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Heroku CLI 未安裝
    echo 請安裝 Heroku CLI: https://devcenter.heroku.com/articles/heroku-cli
    exit /b 1
)

echo 🔍 獲取 %APP_NAME% 的資料庫連接資訊...

REM 獲取資料庫 URL
for /f "tokens=*" %%i in ('heroku config:get DATABASE_URL -a %APP_NAME%') do set DATABASE_URL=%%i

if "!DATABASE_URL!"=="" (
    echo ❌ 無法獲取資料庫 URL
    echo 請檢查應用名稱是否正確，或是否有權限訪問該應用
    exit /b 1
)

echo ✅ 資料庫連接資訊獲取成功
echo 🐳 使用 Docker 連接到 PostgreSQL...

if "%SQL_COMMAND%"=="" (
    REM 互動模式
    docker run --rm -it postgres:15 psql "!DATABASE_URL!"
) else (
    REM 執行單一命令
    docker run --rm postgres:15 psql "!DATABASE_URL!" -c "%SQL_COMMAND%"
)

endlocal
