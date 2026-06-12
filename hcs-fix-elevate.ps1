# Self-elevate and run hcs-fix with visible window
$scriptPath = "d:\3、系统项目开发\trae_projects\SMYweb3.020260527\hcs-fix.ps1"

# Check current privilege
$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if ($isAdmin) {
    Write-Host "Already admin, running fix directly..." -ForegroundColor Green
    & $scriptPath
    Read-Host "Press Enter to close"
} else {
    Write-Host "===== Elevation needed =====" -ForegroundColor Yellow
    Write-Host "A UAC dialog will appear." -ForegroundColor Yellow
    Write-Host "Click YES, then wait for the new admin PowerShell window to finish." -ForegroundColor Yellow
    Write-Host ""
    Start-Sleep -Seconds 2
    # Use -WindowStyle Normal to ensure visibility
    Start-Process powershell.exe -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`"" -WindowStyle Normal
    Write-Host "UAC prompt should be visible now." -ForegroundColor Green
}
