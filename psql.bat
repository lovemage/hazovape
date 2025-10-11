@echo off
REM Docker psql tool

setlocal enabledelayedexpansion

REM Check Docker
docker version >nul 2>&1
if %errorlevel% neq 0 (
    echo Docker not running, please start Docker Desktop
    exit /b 1
)

REM Show help if no parameters
if "%~1"=="" (
    echo Docker psql usage:
    echo   psql.bat [psql parameters]
    echo   psql.bat --version
    echo   psql.bat "postgresql://user:pass@host:port/db"
    echo   psql.bat heroku app-name
    exit /b 0
)

REM Handle Heroku connection
if /i "%1"=="heroku" (
    if "%~2"=="" (
        echo Please provide Heroku app name
        echo Usage: psql.bat heroku app-name
        exit /b 1
    )

    echo Getting database URL for %2...
    for /f "tokens=*" %%i in ('heroku config:get DATABASE_URL -a %2') do set DATABASE_URL=%%i

    if "!DATABASE_URL!"=="" (
        echo Cannot get database URL
        exit /b 1
    )

    echo Connecting with Docker...
    docker run --rm -it postgres:15 psql "!DATABASE_URL!"
    goto :end
)

REM General psql command
echo Running psql with Docker...
docker run --rm -it postgres:15 psql %*

:end
endlocal
