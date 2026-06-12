@echo off
echo ============================================
echo   HCS Service Fix for WSL 2 (needs admin)
echo ============================================
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "d:\3、系统项目开发\trae_projects\SMYweb3.020260527\hcs-fix.ps1"
echo.
echo ============================================
echo   Done. Check D:\wsl-setup\hcs-fix.log
echo ============================================
pause
