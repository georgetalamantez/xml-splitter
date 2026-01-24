@echo off
e   SETLOCAL
cd /d %~dp0

echo ==========================================
echo    XML Splitter Web App - Startup
echo ==========================================

REM Check for node_modules
if not exist node_modules (
    echo [INFO] node_modules not found. Installing dependencies...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] npm install failed. Please check your internet connection and Node.js installation.
        pause
        exit /b %ERRORLEVEL%
    )
)

echo [INFO] Starting the server...
echo [INFO] Access the app at http://localhost:3001
call npm start

if %ERRORLEVEL% neq 0 (
    echo [ERROR] Server failed to start.
    pause
    exit /b %ERRORLEVEL%
)

pause
