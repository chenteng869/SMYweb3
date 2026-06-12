# WSL 2 完整启用脚本(管理员)
$ErrorActionPreference = "Continue"

Write-Host "=== WSL 2 完整启用 ===" -ForegroundColor Cyan

# 1. 启用 WSL 功能
Write-Host "[1/5] 启用 Microsoft-Windows-Subsystem-Linux..." -ForegroundColor Yellow
$out = dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart 2>&1
$out | Out-String | Out-Null
Write-Host "  结果: $($out | Select-Object -Last 3 | Out-String)" -ForegroundColor DarkGray

# 2. 启用虚拟机平台
Write-Host "[2/5] 启用 VirtualMachinePlatform..." -ForegroundColor Yellow
$out = dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart 2>&1
$out | Out-String | Out-Null
Write-Host "  结果: $($out | Select-Object -Last 3 | Out-String)" -ForegroundColor DarkGray

# 3. WSL update
Write-Host "[3/5] WSL update..." -ForegroundColor Yellow
wsl --update 2>&1 | Out-Null

# 4. WSL 默认版本 2
Write-Host "[4/5] 设置默认 WSL 2..." -ForegroundColor Yellow
wsl --set-default-version 2 2>&1 | Out-Null

# 5. 安装 Ubuntu
Write-Host "[5/5] 安装 Ubuntu(可能 5-10 分钟)..." -ForegroundColor Yellow
$out = wsl --install -d Ubuntu --no-launch 2>&1
$out | Out-String | Out-Null
Write-Host "  结果: $($out | Out-String)" -ForegroundColor DarkGray

Write-Host ""
Write-Host "=== 验证 ===" -ForegroundColor Cyan
wsl --status 2>&1 | Out-String
wsl --list --verbose 2>&1 | Out-String

Write-Host ""
Read-Host "按 Enter 关闭"
