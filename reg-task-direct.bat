@echo off
schtasks /delete /tn WSL-Docker-PostRestart-Setup /f 2>nul
schtasks /create /tn WSL-Docker-PostRestart-Setup /tr "D:\wsl-setup\setup-wrapper.cmd" /sc ONLOGON /rl HIGHEST /f
echo EXITCODE=%ERRORLEVEL%
schtasks /query /tn WSL-Docker-PostRestart-Setup
