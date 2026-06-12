# Docker 终极清理脚本(以管理员运行)
# 删 AppData\Local\Docker(含锁定的 VHDX)

$ErrorActionPreference = "Continue"
$path = "C:\Users\HUAWEI\AppData\Local\Docker"

Write-Host "=== Docker Local\Docker 终极清理 ===" -ForegroundColor Cyan
Write-Host ""

# 1. 停所有 Docker 相关
Write-Host "[1/6] 停 Docker 服务和进程..." -ForegroundColor Yellow
Stop-Service com.docker.service -Force -ErrorAction SilentlyContinue
Get-Process | Where-Object { $_.Name -match "docker|com.docker" } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep 3

# 2. 停 WSL
Write-Host "[2/6] 停 WSL..." -ForegroundColor Yellow
wsl --shutdown 2>&1 | Out-Null
Start-Sleep 2

# 3. takeown 夺权
Write-Host "[3/6] takeown 夺权..." -ForegroundColor Yellow
& takeown.exe /F $path /R /A /D Y 2>&1 | Out-Null
Start-Sleep 1

# 4. icacls 给 Everyone 完全控制
Write-Host "[4/6] icacls 给权限..." -ForegroundColor Yellow
& icacls.exe $path /grant Everyone:F /T /C /Q 2>&1 | Out-Null
Start-Sleep 1

# 5. 删除
Write-Host "[5/6] 删除目录(可能需要 1-3 分钟)..." -ForegroundColor Yellow
$deleted = $false
if (Test-Path $path) {
    try {
        Remove-Item -Path $path -Recurse -Force -ErrorAction Stop
        $deleted = $true
    } catch {
        Write-Host "  PowerShell Remove-Item 失败: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "  改用 cmd rmdir..." -ForegroundColor Yellow
        & cmd.exe /c "rmdir /S /Q `"$path`"" 2>&1 | Out-Null
    }
}
Start-Sleep 1

# 6. 验证
Write-Host "[6/6] 验证..." -ForegroundColor Yellow
$exists = Test-Path $path
if ($exists) {
    Write-Host ""
    Write-Host "❌ 仍存在: $path" -ForegroundColor Red
    Write-Host "   请尝试重启电脑后再次运行" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "✓ 已删除: $path" -ForegroundColor Green
}

# 注销 WSL 发行版
Write-Host ""
Write-Host "注销 WSL docker 发行版..." -ForegroundColor Yellow
& wsl.exe --unregister docker-desktop 2>&1 | Out-Null
& wsl.exe --unregister docker-desktop-data 2>&1 | Out-Null

Write-Host ""
Write-Host "=== 完成 ===" -ForegroundColor Cyan
Write-Host "下一步:" -ForegroundColor White
Write-Host "  1. 重启电脑" -ForegroundColor White
Write-Host "  2. 启动 Docker Desktop" -ForegroundColor White
Write-Host "  3. 如果提示 WSL,先运行: wsl --install -d Ubuntu" -ForegroundColor White
Write-Host ""
Read-Host "按 Enter 关闭"
