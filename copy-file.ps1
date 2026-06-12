# Copy a file (path is in args, no Chinese in script)
# Usage: copy-file.ps1 <source> <dest>
$src = $args[0]
$dst = $args[1]
Copy-Item -Path $src -Destination $dst -Force
if (Test-Path $dst) {
    Write-Host "OK: copied to $dst"
    $info = Get-Item $dst
    Write-Host "Size: $($info.Length) bytes"
} else {
    Write-Host "FAIL"
}
