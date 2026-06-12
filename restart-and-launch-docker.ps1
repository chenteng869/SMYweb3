# 延迟重启(60秒)+ 启动 Docker Desktop
# 让用户有 1 分钟保存工作

Write-Host "=== 安排重启 ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "60 秒后自动重启,请保存好工作" -ForegroundColor Yellow
Write-Host ""
Write-Host "重启登录后:" -ForegroundColor Cyan
Write-Host "  1. Docker Desktop 会自动出现在任务栏" -ForegroundColor White
Write-Host "  2. 等它初始化完(蓝色图标 = 启动中,绿色 = 就绪)" -ForegroundColor White
Write-Host "  3. 然后右键 Docker → Troubleshoot → Clean/Purge data(可选)" -ForegroundColor White
Write-Host "  4. 然后启动第一个容器测试: docker run hello-world" -ForegroundColor White
Write-Host ""

$cancel = Read-Host "输入 1 取消重启,直接回车继续"
if ($cancel -eq "1") {
    Write-Host "已取消重启" -ForegroundColor Red
    Read-Host "按 Enter 关闭"
    exit
}

Write-Host ""
Write-Host "[1/2] 关闭 Docker Desktop..." -ForegroundColor Yellow
Get-Process -Name "Docker Desktop","com.docker.*" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep 2

Write-Host "[2/2] 安排重启 (60 秒后)..." -ForegroundColor Yellow
shutdown.exe /r /t 60 /c "WSL 功能已启用,需要重启以完成 WSL 2 安装"

Write-Host ""
Write-Host "✓ 60 秒后自动重启" -ForegroundColor Green
Write-Host ""
Write-Host "如果想取消: 运行 shutdown /a" -ForegroundColor DarkGray
Read-Host "按 Enter 关闭"
