@echo off
title SmartLab PC Monitor Agent - CLA-PC-001 (Lenovo)
cd /d "%~dp0"
set SERVER_URL=https://smartlab-management-system.onrender.com
if not "%~1"=="" set SERVER_URL=%~1
echo ========================================================
echo  SmartLab Telemetry Agent - CLA-PC-001 (Lenovo PC)
echo  Streaming CPU, RAM, and Disk metrics every 30 seconds
echo  Server: %SERVER_URL%
echo ========================================================
python monitoring\pc_monitor.py --pc-id CLA-PC-001 --server %SERVER_URL% --interval 30
pause
 