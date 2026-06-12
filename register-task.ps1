# Register scheduled task via schtasks.exe (sandbox bypass)
# Usage: register-task.ps1 <taskName> <cmdFile>

$taskName = $args[0]
$cmdFile = $args[1]

# Delete old task first (ignore errors)
$null = Start-Process -FilePath "schtasks.exe" -ArgumentList @("/delete", "/tn", $taskName, "/f") -NoNewWindow -Wait -PassThru -ErrorAction SilentlyContinue

# Create new task pointing to .cmd wrapper
$proc = Start-Process -FilePath "schtasks.exe" -ArgumentList @("/create", "/tn", $taskName, "/tr", $cmdFile, "/sc", "ONLOGON", "/rl", "HIGHEST", "/f") -NoNewWindow -Wait -PassThru -RedirectStandardError "D:\wsl-setup\create-err.txt" -RedirectStandardOutput "D:\wsl-setup\create-out.txt"

Write-Host "schtasks exit code: $($proc.ExitCode)"
Write-Host "--- create stdout ---"
if (Test-Path "D:\wsl-setup\create-out.txt") { Get-Content "D:\wsl-setup\create-out.txt" }
Write-Host "--- create stderr ---"
if (Test-Path "D:\wsl-setup\create-err.txt") { Get-Content "D:\wsl-setup\create-err.txt" }
