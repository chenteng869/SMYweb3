$log = @()
$log += "=== HCS service check ==="
$log += Get-Service vmcompute,hcs,hyper-v -ErrorAction SilentlyContinue | Format-Table Name,Status,StartType -AutoSize | Out-String
$log += "=== HCS scheduled tasks ==="
$log += Get-ScheduledTask -TaskPath '\Microsoft\Windows\Hyper-V\*' -ErrorAction SilentlyContinue | Format-Table TaskName,State -AutoSize | Out-String
$log += "=== Hyper-V executables ==="
$log += Get-ChildItem 'C:\Windows\System32\vmcompute.exe','C:\Windows\System32\hcs.exe' -ErrorAction SilentlyContinue | Format-Table FullName -AutoSize | Out-String
$log += "=== Drivers ==="
$log += Get-WindowsDriver -Online -Driver "vmic*" -ErrorAction SilentlyContinue | Format-Table ProviderName,ClassName,Driver -AutoSize | Out-String
$log -join "`n" | Out-File -FilePath "D:\wsl-setup\diag.log" -Encoding UTF8
Get-Content "D:\wsl-setup\diag.log"
