@echo off
title SmartLab PC Monitor Agent - AML-PC-001 (Dell)
cd /d "%~dp0"
echo ========================================================
echo  SmartLab Telemetry Agent - AML-PC-001 (Dell PC)
echo  Streaming CPU, RAM, and Disk metrics every 30 seconds
echo ========================================================
python monitoring\pc_monitor.py --pc-id AML-PC-001 --server http://localhost:8000 --interval 30
pause
