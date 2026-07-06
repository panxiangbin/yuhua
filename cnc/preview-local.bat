@echo off
setlocal
cd /d "%~dp0"
echo Starting CNC quick finder preview at http://localhost:8000
start "CNC Quick Finder Server" /min cmd /c python -m http.server 8000
timeout /t 2 /nobreak >nul
start "" "http://localhost:8000"
