@echo off
REM 資料庫工具集 - 使用 Docker 提供完整的 PostgreSQL 工具

setlocal enabledelayedexpansion

if "%~1"=="" goto :show_help

set COMMAND=%1
shift

REM 檢查 Docker 是否運行
docker version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker 未運行或未安裝
    echo 請確保 Docker Desktop 正在運行
    exit /b 1
)

REM 根據命令執行不同操作
if /i "%COMMAND%"=="psql" goto :run_psql
if /i "%COMMAND%"=="heroku" goto :run_heroku
if /i "%COMMAND%"=="backup" goto :run_backup
if /i "%COMMAND%"=="restore" goto :run_restore
if /i "%COMMAND%"=="test" goto :run_test
goto :show_help

:run_psql
echo 🐳 執行 psql...
docker run --rm -it postgres:15 psql %*
goto :end

:run_heroku
if "%~1"=="" (
    echo ❌ 請提供 Heroku 應用名稱
    goto :end
)
set APP_NAME=%1
shift
echo 🔍 連接到 Heroku 應用: %APP_NAME%
for /f "tokens=*" %%i in ('heroku config:get DATABASE_URL -a %APP_NAME%') do set DATABASE_URL=%%i
if "!DATABASE_URL!"=="" (
    echo ❌ 無法獲取資料庫 URL
    goto :end
)
echo 🐳 使用 Docker 連接...
if "%~1"=="" (
    docker run --rm -it postgres:15 psql "!DATABASE_URL!"
) else (
    docker run --rm postgres:15 psql "!DATABASE_URL!" -c "%*"
)
goto :end

:run_backup
echo 🐳 執行資料庫備份...
docker run --rm postgres:15 pg_dump %*
goto :end

:run_restore
echo 🐳 執行資料庫還原...
docker run --rm -i postgres:15 psql %*
goto :end

:run_test
echo 🧪 測試 Docker PostgreSQL 工具...
docker run --rm postgres:15 psql --version
echo ✅ Docker PostgreSQL 工具正常運行
goto :end

:show_help
echo 📋 資料庫工具集使用方法:
echo.
echo   db-tools.bat psql [參數]           - 執行 psql
echo   db-tools.bat heroku app-name [SQL] - 連接 Heroku 資料庫
echo   db-tools.bat backup [參數]         - 備份資料庫
echo   db-tools.bat restore [參數]        - 還原資料庫
echo   db-tools.bat test                  - 測試工具
echo.
echo 範例:
echo   db-tools.bat psql --version
echo   db-tools.bat heroku hazo-vape
echo   db-tools.bat heroku hazo-vape "SELECT COUNT(*) FROM orders;"
echo   db-tools.bat test
echo.

:end
endlocal
