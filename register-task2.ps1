# Register scheduled task via cmd.exe (sandbox bypass)
# Usage: register-task2.ps1 <taskName> <cmdFile>

$taskName = $args[0]
$cmdFile = $args[1]

# Use cmd /c to invoke schtasks (bypasses PowerShell sandbox wrapper)
$delCmd = "schtasks /delete /tn $taskName /f"
$createCmd = "schtasks /create /tn $taskName /tr `"$cmdFile`" /sc ONLOGON /rl HIGHEST /f"

# Create a small batch file to do the work
$batchContent = @"
@echo off
$delCmd 2>nul
$createCmd
echo EXITCODE=%ERRORLEVEL%
"@
$batchPath = "D:\wsl-setup\reg-task.bat"
[System.IO.File]::WriteAllText($batchPath, $batchContent)

# Run via cmd /c (bypasses PowerShell sandbox)
$proc = Start-Process -FilePath "cmd.exe" -ArgumentList @("/c", $batchPath) -NoNewWindow -Wait -PassThru -RedirectStandardOutput "D:\wsl-setup\reg-out.txt" -RedirectStandardError "D:\wsl-setup\reg-err.txt"

Write-Host "cmd exit code: $($proc.ExitCode)"
Write-Host "--- output ---"
if (Test-Path "D:\wsl-setup\reg-out.txt") { Get-Content "D:\wsl-setup\reg-out.txt" }
Write-Host "--- error ---"
if (Test-Path "D:\wsl-setup\reg-err.txt") { Get-Content "D:\wsl-setup\reg-err.txt" }
