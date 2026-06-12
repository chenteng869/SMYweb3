# WSL Ubuntu install + Docker Desktop start
# Trigger: Runs at user logon via HKCU Run key "WSL-Docker-PostRestart"
# Log: $env:USERPROFILE\wsl-docker-setup.log
# Self-destructs the Run key after successful run

$logFile = "$env:USERPROFILE\wsl-docker-setup.log"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$runKeyName = "WSL-Docker-PostRestart"

function Write-Log {
    param([string]$Message)
    $entry = "[$timestamp] $Message"
    Add-Content -Path $logFile -Value $entry -Encoding UTF8
    Write-Host $entry
}

# Remove the Run key (one-time execution)
try {
    Remove-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" -Name $runKeyName -ErrorAction SilentlyContinue
    Write-Log "Self-destructed Run key"
} catch {
    Write-Log "Run key removal skipped: $_"
}

Write-Log "================================================"
Write-Log "WSL Ubuntu + Docker Desktop setup starting"
Write-Log "================================================"

# Step 1: Check WSL features
Write-Log "[Step 1/5] Checking WSL features..."
$wslFeature = Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux -ErrorAction SilentlyContinue
if ($wslFeature -and $wslFeature.State -ne "Enabled") {
    Write-Log "WSL feature not enabled, enabling..."
    Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux -NoRestart -ErrorAction SilentlyContinue
}
$vmFeature = Get-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform -ErrorAction SilentlyContinue
if ($vmFeature -and $vmFeature.State -ne "Enabled") {
    Write-Log "VirtualMachinePlatform not enabled, enabling..."
    Enable-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform -NoRestart -ErrorAction SilentlyContinue
}
Write-Log "WSL features OK"

# Step 2: Set WSL 2 as default
Write-Log "[Step 2/5] Setting WSL 2 as default..."
wsl --set-default-version 2 2>&1 | Out-Null
Write-Log "WSL 2 default set"

# Step 3: Install Ubuntu (if not installed)
Write-Log "[Step 3/5] Checking Ubuntu distro..."
$existing = wsl --list --quiet 2>&1
$needsInstall = $false
if ($LASTEXITCODE -ne 0) { $needsInstall = $true }
if (-not $needsInstall) {
    $lines = ($existing | Out-String).Trim()
    if ([string]::IsNullOrWhiteSpace($lines)) { $needsInstall = $true }
}
if ($needsInstall) {
    Write-Log "Ubuntu not installed, installing (--no-launch, no terminal pop)..."
    wsl --install -d Ubuntu --no-launch
    if ($LASTEXITCODE -eq 0) {
        Write-Log "Ubuntu install request submitted, waiting 60s for init..."
        Start-Sleep -Seconds 60
    } else {
        Write-Log "Ubuntu install failed, exit code: $LASTEXITCODE"
    }
} else {
    Write-Log "Ubuntu already exists: $existing"
}

# Step 4: Wait for Ubuntu user init
Write-Log "[Step 4/5] Waiting for Ubuntu user init..."
$maxWait = 180
$waited = 0
$initialized = $false
while ($waited -lt $maxWait) {
    $test = wsl -d Ubuntu -e whoami 2>&1
    if ($LASTEXITCODE -eq 0 -and $test -match "root|user") {
        Write-Log "Ubuntu user initialized: $test"
        $initialized = $true
        break
    }
    Write-Log "Waiting for Ubuntu init... ($waited/$maxWait s)"
    Start-Sleep -Seconds 15
    $waited += 15
}

if (-not $initialized) {
    Write-Log "WARNING: Ubuntu init timeout. You may need to manually open Ubuntu terminal and set username/password."
}

# Step 5: Start Docker Desktop
Write-Log "[Step 5/5] Starting Docker Desktop..."
$dockerExe = "${env:ProgramFiles}\Docker\Docker\Docker Desktop.exe"
if (Test-Path $dockerExe) {
    Start-Process -FilePath $dockerExe
    Write-Log "Docker Desktop started, waiting 60s for engine..."
    Start-Sleep -Seconds 60
} else {
    Write-Log "Docker Desktop.exe not found: $dockerExe"
}

# Verify
Write-Log "===== Verifying docker ====="
try {
    $version = docker --version 2>&1
    Write-Log "docker version: $version"
} catch {
    Write-Log "docker not ready, waiting 30s and retrying..."
    Start-Sleep -Seconds 30
    try {
        $version = docker --version 2>&1
        Write-Log "docker version: $version"
    } catch {
        Write-Log "docker still not available. Please run manually in terminal: docker --version"
    }
}

Write-Log "================================================"
Write-Log "Script complete"
Write-Log "Log file: $logFile"
Write-Log "================================================"
