# Add registry Run key to auto-execute setup on user logon
# Usage: add-run-key.ps1 <name> <command>
$name = $args[0]
$cmd = $args[1]
$key = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
Set-ItemProperty -Path $key -Name $name -Value $cmd -Force
$val = Get-ItemProperty -Path $key -Name $name
Write-Host "Run key set: $name = $($val.$name)"
