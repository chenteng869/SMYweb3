# One-click solution: Register scheduled task + schedule 3-min restart
# What this does:
# 1. Register wsl-post-restart-setup.ps1 as "At logon" task
# 2. Schedule Windows restart in 3 minutes
# 3. After login, task auto-runs (install Ubuntu + start Docker)

$ErrorActionPreference = "Stop"
$taskName = "WSL-Docker-PostRestart-Setup"
$scriptPath = "d:\3、系统项目开发\trae_projects\SMYweb3.020260527\wsl-post-restart-setup.ps1"

Write-Host "============================================="
Write-Host "WSL + Docker One-Click Setup" -ForegroundColor Cyan
Write-Host "============================================="
Write-Host ""

# Step 1: Verify script exists
if (-not (Test-Path $scriptPath)) {
    Write-Host "ERROR: Script not found: $scriptPath" -ForegroundColor Red
    exit 1
}
Write-Host "[1/3] Script verified" -ForegroundColor Green

# Step 2: Register scheduled task (run as current user at logon)
Write-Host "[2/3] Registering scheduled task '$taskName' ..."

# Remove existing task
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Host "  - Old task cleared"
}

# Create new task
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -RunLevel Highest -LogonType Interactive

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description "WSL Ubuntu install + Docker Desktop start (runs automatically after restart)" | Out-Null
Write-Host "  - Task registered" -ForegroundColor Green

# Step 3: Schedule restart (3-min countdown)
Write-Host "[3/3] Scheduling restart in 3 minutes..."
Write-Host ""
Write-Host "============================================="
Write-Host "  Windows will restart in 3 minutes" -ForegroundColor Yellow
Write-Host "  After login, task will auto:" -ForegroundColor Yellow
Write-Host "    - Install Ubuntu" -ForegroundColor Yellow
Write-Host "    - Start Docker Desktop" -ForegroundColor Yellow
Write-Host "    - Run docker --version" -ForegroundColor Yellow
Write-Host "" -ForegroundColor Yellow
Write-Host "  Log: C:\Users\$env:USERNAME\wsl-docker-setup.log" -ForegroundColor Yellow
Write-Host "============================================="
Write-Host ""
Write-Host "To cancel restart, run within 3 min: shutdown /a" -ForegroundColor Cyan
Write-Host ""

# Confirm
$confirm = Read-Host "Confirm restart? (Y/N)"
if ($confirm -eq "Y" -or $confirm -eq "y") {
    Write-Host ""
    Write-Host "Executing restart command..." -ForegroundColor Green
    shutdown /r /t 180 /c "WSL+Docker one-click setup"
} else {
    Write-Host "Restart cancelled" -ForegroundColor Yellow
    Write-Host "Task is still registered. You can trigger manually: shutdown /r /t 60" -ForegroundColor Cyan
}
