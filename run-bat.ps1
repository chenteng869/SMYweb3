# Run a .bat file (path is in args)
# Usage: run-bat.ps1 <batpath>
$batPath = $args[0]
$proc = Start-Process -FilePath "cmd.exe" -ArgumentList @("/c", $batPath) -NoNewWindow -Wait -PassThru -RedirectStandardOutput "D:\wsl-setup\run-out.txt" -RedirectStandardError "D:\wsl-setup\run-err.txt"
Write-Host "ExitCode: $($proc.ExitCode)"
Write-Host "--- stdout ---"
if (Test-Path "D:\wsl-setup\run-out.txt") { Get-Content "D:\wsl-setup\run-out.txt" }
Write-Host "--- stderr ---"
if (Test-Path "D:\wsl-setup\run-err.txt") { Get-Content "D:\wsl-setup\run-err.txt" }
