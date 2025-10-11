@echo off
REM Docker-based psql wrapper for Windows
REM 使用 Docker 提供 psql 功能，無需本地安裝 PostgreSQL

setlocal enabledelayedexpansion

REM 檢查 Docker 是否運行
docker version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker 未運行或未安裝
    echo 請確保 Docker Desktop 正在運行
    exit /b 1
)

REM 如果沒有參數，顯示幫助
if "%~1"=="" (
    echo 📋 Docker psql 使用方法:
    echo.
    echo   psql-docker.bat [psql參數]
    echo.
    echo 範例:
    echo   psql-docker.bat --version
    echo   psql-docker.bat -h localhost -U username -d database
    echo   psql-docker.bat "postgresql://user:pass@host:port/db"
    echo.
    echo 🔧 Heroku 使用範例:
    echo   set DATABASE_URL=your_heroku_database_url
    echo   psql-docker.bat "%%DATABASE_URL%%"
    exit /b 0
)

REM 執行 Docker psql
echo 🐳 使用 Docker 執行 psql...
docker run --rm -it ^
    -e PGPASSWORD=%PGPASSWORD% ^
    postgres:15 ^
    psql %*

endlocal
