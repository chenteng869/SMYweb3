$f = 'C:\Users\HUAWEI\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1'
$bytes = [System.IO.File]::ReadAllBytes($f)
'0x{0:X2} 0x{1:X2} 0x{2:X2}' -f $bytes[0], $bytes[1], $bytes[2]
