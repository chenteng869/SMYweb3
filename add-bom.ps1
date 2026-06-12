# Add UTF-8 BOM to a PS1 file. Path is passed as $args[0].
# Usage: powershell -File add-bom.ps1 "<path1>" "<path2>" ...
if ($args.Count -eq 0) {
    Write-Host "Usage: add-bom.ps1 <path1> [path2] ..."
    exit 1
}

$bom = [byte[]](0xEF, 0xBB, 0xBF)

foreach ($p in $args) {
    if (-not (Test-Path $p)) {
        Write-Host "SKIP (not found): $p"
        continue
    }
    $bytes = [System.IO.File]::ReadAllBytes($p)
    if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
        Write-Host "ALREADY BOM: $p"
        continue
    }
    $new = $bom + $bytes
    [System.IO.File]::WriteAllBytes($p, $new)
    Write-Host "BOM ADDED: $p"
}
