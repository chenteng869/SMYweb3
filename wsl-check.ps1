[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null
wsl --update
echo "---"
wsl --list --verbose
echo "---"
wsl --status
