# Register a "run now" task with highest privileges (no UAC)
# Usage: register-now-task.ps1 <taskName> <command>
$taskName = $args[0]
$cmd = $args[1]

# Build schtasks command
# /create /tn NAME /tr COMMAND /sc ONCE /st 00:00 /rl HIGHEST /f /Z
# /sc ONCE /st 00:00 means "schedule for now-ish"
# /rl HIGHEST = run with highest privileges
# /f = force (overwrite)
# /Z = delete after run

$delProc = Start-Process -FilePath "schtasks.exe" -ArgumentList @("/delete", "/tn", $taskName, "/f") -NoNewWindow -Wait -PassThru -ErrorAction SilentlyContinue

$proc = Start-Process -FilePath "schtasks.exe" -ArgumentList @("/create", "/tn", $taskName, "/tr", $cmd, "/sc", "ONCE", "/st", "00:00", "/rl", "HIGHEST", "/f", "/Z") -NoNewWindow -Wait -PassThru -RedirectStandardError "D:\wsl-setup\task-err.txt" -RedirectStandardOutput "D:\wsl-setup\task-out.txt"

Write-Host "create exit: $($proc.ExitCode)"
if (Test-Path "D:\wsl-setup\task-err.txt") { Get-Content "D:\wsl-setup\task-err.txt" }
if (Test-Path "D:\wsl-setup\task-out.txt") { Get-Content "D:\wsl-setup\task-out.txt" }

# Trigger the task
$runProc = Start-Process -FilePath "schtasks.exe" -ArgumentList @("/run", "/tn", $taskName) -NoNewWindow -Wait -PassThru -RedirectStandardError "D:\wsl-setup\run-err.txt" -RedirectStandardOutput "D:\wsl-setup\run-out.txt"
Write-Host "run exit: $($runProc.ExitCode)"
if (Test-Path "D:\wsl-setup\run-err.txt") { Get-Content "D:\wsl-setup\run-err.txt" }
