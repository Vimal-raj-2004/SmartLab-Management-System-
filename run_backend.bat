@echo off
title SmartLab Backend API Server (Port 8000)
cd /d "%~dp0backend"
echo ========================================================
echo  Starting FastAPI Backend Server...
echo  URL:  http://localhost:8000
echo  Docs: http://localhost:8000/docs
echo ========================================================
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Backend encountered an error. If uvicorn or dependencies are missing, run:
    echo pip install -r requirements.txt
)
pause
