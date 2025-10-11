# 簡化的 PostgreSQL 客戶端安裝腳本

Write-Host "PostgreSQL 客戶端工具安裝腳本" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# 檢查管理員權限
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

if (-not $isAdmin) {
    Write-Host "請以管理員身份運行此腳本" -ForegroundColor Red
    Write-Host "右鍵點擊 PowerShell -> 以系統管理員身分執行" -ForegroundColor Yellow
    Read-Host "按 Enter 鍵退出"
    exit 1
}

Write-Host "管理員權限確認" -ForegroundColor Green

# 檢查 psql 是否已安裝
$psqlExists = Get-Command psql -ErrorAction SilentlyContinue
if ($psqlExists) {
    Write-Host "psql 已安裝" -ForegroundColor Green
    psql --version
    Read-Host "按 Enter 鍵退出"
    exit 0
}

Write-Host "psql 未安裝，開始安裝程序..." -ForegroundColor Yellow

# 檢查 Chocolatey
$chocoExists = Get-Command choco -ErrorAction SilentlyContinue
if (-not $chocoExists) {
    Write-Host "安裝 Chocolatey 包管理器..." -ForegroundColor Yellow
    
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    
    try {
        Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
        Write-Host "Chocolatey 安裝成功" -ForegroundColor Green
        
        # 重新載入 PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    }
    catch {
        Write-Host "Chocolatey 安裝失敗" -ForegroundColor Red
        Write-Host "請手動安裝 PostgreSQL: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
        Start-Process "https://www.postgresql.org/download/windows/"
        Read-Host "按 Enter 鍵退出"
        exit 1
    }
}
else {
    Write-Host "Chocolatey 已安裝" -ForegroundColor Green
}

# 安裝 PostgreSQL
Write-Host "安裝 PostgreSQL 客戶端工具..." -ForegroundColor Yellow

try {
    choco install postgresql --params "/Password:postgres" -y
    
    Write-Host "PostgreSQL 安裝成功" -ForegroundColor Green
    
    # 重新載入 PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    
    # 測試安裝
    Start-Sleep -Seconds 3
    
    $psqlExists = Get-Command psql -ErrorAction SilentlyContinue
    if ($psqlExists) {
        Write-Host "psql 安裝成功！" -ForegroundColor Green
        psql --version
    }
    else {
        Write-Host "psql 命令未在 PATH 中，可能需要重新啟動命令提示字元" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "PostgreSQL 安裝失敗" -ForegroundColor Red
    Write-Host "請手動安裝: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    Start-Process "https://www.postgresql.org/download/windows/"
}

Write-Host ""
Write-Host "安裝完成！" -ForegroundColor Green
Write-Host "如果 psql 命令仍然找不到，請重新啟動命令提示字元" -ForegroundColor Yellow

Read-Host "按 Enter 鍵退出"
