@echo off
title SmartLab Frontend Web Application (Port 5173)
cd /d "%~dp0frontend"
echo ========================================================
echo  Starting React + Vite Frontend...
echo  URL: http://localhost:5173
echo ========================================================
npm run dev
pause
