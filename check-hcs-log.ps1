$logPath = "D:\wsl-setup\hcs-fix.log"
if (Test-Path $logPath) {
    $info = Get-Item $logPath
    Write-Host "Last modified: $($info.LastWriteTime)"
    Write-Host "--- Content ---"
    Get-Content $logPath
} else {
    Write-Host "Log not created yet (UAC not clicked or new window not opened)"
}
