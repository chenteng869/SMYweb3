[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null
$logDir = "D:\wsl-setup"
$logFile = Join-Path $logDir "wsl-install.log"
if (-not (Test-Path $logDir)) { New-Item -Path $logDir -ItemType Directory -Force | Out-Null }
"$(Get-Date -Format 'HH:mm:ss') Starting Ubuntu install..." | Out-File -FilePath $logFile -Append -Encoding UTF8
wsl --install -d Ubuntu --no-launch 2>&1 | Out-File -FilePath $logFile -Append -Encoding UTF8
"$(Get-Date -Format 'HH:mm:ss') Exit code: $LASTEXITCODE" | Out-File -FilePath $logFile -Append -Encoding UTF8
"---" | Out-File -FilePath $logFile -Append -Encoding UTF8
wsl --list --verbose 2>&1 | Out-File -FilePath $logFile -Append -Encoding UTF8
Get-Content $logFile
