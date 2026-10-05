@echo off
title SmartLab System Launcher
cd /d "%~dp0"
echo ========================================================
echo  Launching Smart Computer Laboratory Management System
echo ========================================================
echo 1. Starting Backend API (Port 8000)...
start "SmartLab Backend" cmd /k "cd /d %~dp0backend && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
timeout /t 3 /nobreak >nul

echo 2. Starting Frontend Web App (Port 5173)...
start "SmartLab Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
timeout /t 3 /nobreak >nul

echo 3. Starting PC Telemetry Agent for CLA-PC-001 (Lenovo)...
start "SmartLab PC Telemetry Agent" cmd /k "cd /d %~dp0 && python monitoring\pc_monitor.py --pc-id CLA-PC-001 --server http://localhost:8000 --interval 30"

echo ========================================================
echo  All services triggered!
echo  Backend:  http://localhost:8000
echo  Frontend: http://localhost:5173
echo  PC Agent: Monitoring CLA-PC-001 (Lenovo DESKTOP-F6GT1GS)
echo ========================================================
pause
