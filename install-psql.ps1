# PostgreSQL 客戶端工具安裝腳本 (PowerShell)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "PostgreSQL 客戶端工具安裝腳本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 檢查管理員權限
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "請以管理員身份運行此腳本" -ForegroundColor Red
    Write-Host "右鍵點擊 PowerShell -> 以系統管理員身分執行" -ForegroundColor Yellow
    Read-Host "按 Enter 鍵退出"
    exit 1
}

Write-Host "✅ 管理員權限確認" -ForegroundColor Green

# 檢查 psql 是否已安裝
try {
    $psqlVersion = & psql --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ psql 已安裝: $psqlVersion" -ForegroundColor Green
        Read-Host "按 Enter 鍵退出"
        exit 0
    }
} catch {
    Write-Host "🔍 psql 未安裝，開始安裝程序..." -ForegroundColor Yellow
}

# 檢查 Chocolatey
try {
    $chocoVersion = & choco --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Chocolatey 已安裝: $chocoVersion" -ForegroundColor Green
    } else {
        throw "Chocolatey not found"
    }
} catch {
    Write-Host "📦 安裝 Chocolatey 包管理器..." -ForegroundColor Yellow
    
    try {
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
        
        # 重新載入環境變數
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        
        Write-Host "✅ Chocolatey 安裝成功" -ForegroundColor Green
    } catch {
        Write-Host "❌ Chocolatey 安裝失敗: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "請手動安裝 PostgreSQL" -ForegroundColor Yellow
        Start-Process "https://www.postgresql.org/download/windows/"
        Read-Host "按 Enter 鍵退出"
        exit 1
    }
}

Write-Host ""
Write-Host "📦 安裝 PostgreSQL 客戶端工具..." -ForegroundColor Yellow

try {
    # 使用 Chocolatey 安裝 PostgreSQL
    & choco install postgresql --params "/Password:postgres" -y
    
    if ($LASTEXITCODE -ne 0) {
        throw "Chocolatey install failed"
    }
    
    Write-Host "✅ PostgreSQL 安裝成功" -ForegroundColor Green
    
    # 重新載入環境變數
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    
    Write-Host ""
    Write-Host "🧪 測試 psql 安裝..." -ForegroundColor Yellow
    
    Start-Sleep -Seconds 2
    
    try {
        $psqlVersion = & psql --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ psql 安裝並配置成功！" -ForegroundColor Green
            Write-Host "版本: $psqlVersion" -ForegroundColor Cyan
        } else {
            throw "psql command not found"
        }
    } catch {
        Write-Host "⚠️ psql 命令未在 PATH 中" -ForegroundColor Yellow
        Write-Host "可能需要重新啟動命令提示字元或電腦" -ForegroundColor Yellow
        
        # 嘗試找到 PostgreSQL 安裝路徑
        $pgPaths = @(
            "C:\Program Files\PostgreSQL\*\bin",
            "C:\Program Files (x86)\PostgreSQL\*\bin"
        )
        
        foreach ($path in $pgPaths) {
            $found = Get-ChildItem -Path $path -ErrorAction SilentlyContinue
            if ($found) {
                Write-Host "💡 找到 PostgreSQL 安裝路徑: $($found.FullName)" -ForegroundColor Cyan
                Write-Host "請手動添加此路徑到系統 PATH 環境變數" -ForegroundColor Yellow
                break
            }
        }
    }
    
} catch {
    Write-Host "❌ PostgreSQL 安裝失敗: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "📋 手動安裝指南:" -ForegroundColor Yellow
    Write-Host "1. 訪問: https://www.postgresql.org/download/windows/" -ForegroundColor White
    Write-Host "2. 下載 PostgreSQL 安裝程式" -ForegroundColor White
    Write-Host "3. 運行安裝程式，選擇安裝組件時確保勾選 'Command Line Tools'" -ForegroundColor White
    Write-Host "4. 安裝完成後，PostgreSQL bin 目錄會自動添加到 PATH" -ForegroundColor White
    Write-Host ""
    Write-Host "💡 或者繼續使用 Docker 方案:" -ForegroundColor Cyan
    Write-Host "  psql.bat --version" -ForegroundColor White
    Write-Host "  psql.bat heroku hazo-vape" -ForegroundColor White
    
    Start-Process "https://www.postgresql.org/download/windows/"
}

Write-Host ""
Write-Host "🎉 安裝程序完成！" -ForegroundColor Green
Write-Host ""
Write-Host "📋 使用方法:" -ForegroundColor Cyan
Write-Host "  psql --version" -ForegroundColor White
Write-Host "  psql `"postgresql://user:pass@host:port/db`"" -ForegroundColor White
Write-Host ""
Write-Host "🔧 如果 psql 命令仍然找不到，請：" -ForegroundColor Yellow
Write-Host "  1. 重新啟動命令提示字元" -ForegroundColor White
Write-Host "  2. 或重新啟動電腦" -ForegroundColor White
Write-Host "  3. 或手動添加 PostgreSQL bin 目錄到 PATH" -ForegroundColor White
Write-Host ""

Read-Host "按 Enter 鍵退出"
