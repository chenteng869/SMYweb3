# Trigger UAC and run hcs-fix-visible.cmd in admin context
# This launches a CMD with -Verb RunAs, which has /k pause at end so window stays open

$cmdPath = "d:\3、系统项目开发\trae_projects\SMYweb3.020260527\hcs-fix-visible.cmd"

# Check if already admin
$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if ($isAdmin) {
    Write-Host "Already admin, running directly..." -ForegroundColor Green
    & $cmdPath
} else {
    Write-Host "===== UAC Prompt Incoming =====" -ForegroundColor Yellow
    Write-Host "Watch for the elevation dialog. Click YES." -ForegroundColor Yellow
    Write-Host "The new admin CMD window will STAY OPEN until the fix completes." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    # /k keeps CMD open; we use powershell instead because of pause
    # Use -Verb RunAs on the cmd file directly
    Start-Process cmd.exe -Verb RunAs -ArgumentList "/c `"$cmdPath`"" -WindowStyle Normal
    Write-Host "Done. UAC dialog should be visible." -ForegroundColor Green
}
