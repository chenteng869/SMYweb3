# Fix HCS service for WSL 2
# Run this as Administrator (right-click -> Run as administrator)

$ErrorActionPreference = "Stop"
$log = "D:\wsl-setup\hcs-fix.log"
"=== HCS Fix Start $(Get-Date) ===" | Out-File $log -Encoding UTF8

# 1. Set vmcompute to Manual start
try {
    Set-Service -Name vmcompute -StartupType Manual
    "Set vmcompute to Manual" | Out-File $log -Append -Encoding UTF8
} catch {
    "Set-Service failed: $_" | Out-File $log -Append -Encoding UTF8
}

# 2. Try to start vmcompute
try {
    Start-Service -Name vmcompute
    "Started vmcompute" | Out-File $log -Append -Encoding UTF8
} catch {
    "Start-Service failed: $_" | Out-File $log -Append -Encoding UTF8
    "Trying sc.exe..." | Out-File $log -Append -Encoding UTF8
    & sc.exe config vmcompute start= demand | Out-File $log -Append -Encoding UTF8
    & sc.exe start vmcompute | Out-File $log -Append -Encoding UTF8
}

# 3. Verify
$s = Get-Service vmcompute
"vmcompute: Status=$($s.Status) StartType=$($s.StartType)" | Out-File $log -Append -Encoding UTF8

# 4. Retry WSL install
"=== Retrying wsl --install ===" | Out-File $log -Append -Encoding UTF8
wsl --install -d Ubuntu --no-launch 2>&1 | Out-File $log -Append -Encoding UTF8
"wsl --install exit: $LASTEXITCODE" | Out-File $log -Append -Encoding UTF8

"=== List ===" | Out-File $log -Append -Encoding UTF8
wsl --list --verbose 2>&1 | Out-File $log -Append -Encoding UTF8

"=== Done ===" | Out-File $log -Append -Encoding UTF8
Get-Content $log
