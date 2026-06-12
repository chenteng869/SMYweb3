$ErrorActionPreference = "Continue"
$paths = @(
    "C:\Users\HUAWEI\AppData\Roaming\Docker Desktop",
    "C:\Users\HUAWEI\AppData\Local\Docker"
)
foreach ($p in $paths) {
    if (Test-Path $p) {
        try {
            # 尝试 takeown + icacls
            $take = Start-Process "takeown.exe" -ArgumentList @("/F", $p, "/R", "/A", "/D", "Y") -Wait -NoNewWindow -PassThru -RedirectStandardError "nul"
            $icacls = Start-Process "icacls.exe" -ArgumentList @($p, "/grant", "Everyone:F", "/T", "/C", "/Q") -Wait -NoNewWindow -PassThru -RedirectStandardError "nul"
            Remove-Item -Path $p -Recurse -Force -ErrorAction SilentlyContinue
            $exists = Test-Path $p
            Write-Output "$p : $(if($exists){'STILL_EXISTS'}else{'DELETED'})"
        } catch {
            Write-Output "$p : ERROR_$($_.Exception.Message)"
        }
    } else {
        Write-Output "$p : ALREADY_GONE"
    }
}
# 注销 WSL 发行版
Start-Process "wsl.exe" -ArgumentList @("--unregister","docker-desktop") -Wait -NoNewWindow -RedirectStandardError "nul"
Start-Process "wsl.exe" -ArgumentList @("--unregister","docker-desktop-data") -Wait -NoNewWindow -RedirectStandardError "nul"
Start-Process "wsl.exe" -ArgumentList @("--shutdown") -Wait -NoNewWindow -RedirectStandardError "nul"
Write-Output "WSL_CLEANUP_DONE"
Read-Host "Press Enter to close"
