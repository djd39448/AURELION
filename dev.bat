@echo off
title AURELION Dev Launcher
cd /d "%~dp0"

echo ============================================
echo   AURELION Local Development Launcher
echo ============================================
echo.

:: Check .env exists
if not exist ".env" (
    echo [ERROR] .env file not found in project root.
    echo Copy .env.example to .env and fill in your DATABASE_URL.
    pause
    exit /b 1
)

:: Check node
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Install Node.js 20+ first.
    pause
    exit /b 1
)

:: Check pnpm
where pnpm >nul 2>&1
if errorlevel 1 (
    echo [WARN] pnpm not in PATH, installing globally...
    call npm install -g pnpm
)

:: Install dependencies if node_modules missing
if not exist "node_modules" (
    echo [1/4] Installing dependencies...
    call pnpm install
    if errorlevel 1 (
        echo [ERROR] pnpm install failed.
        pause
        exit /b 1
    )
) else (
    echo [1/4] Dependencies already installed.
)

:: Build API server
echo [2/4] Building API server...
cd artifacts\api-server
call node build.mjs
if errorlevel 1 (
    echo [ERROR] API server build failed.
    pause
    exit /b 1
)
cd ..\..

:: Start API server in background
echo [3/4] Starting API server on port 3001...
start "AURELION API" cmd /k "cd /d "%~dp0artifacts\api-server" && node --env-file=../../.env --enable-source-maps ./dist/index.mjs"

:: Wait for API to be ready
timeout /t 3 /nobreak >nul

:: Start frontend
echo [4/4] Starting frontend on port 3000...
start "AURELION Frontend" cmd /k "cd /d "%~dp0artifacts\aurelion" && npx vite --config vite.config.ts --host 0.0.0.0"

echo.
echo ============================================
echo   Both servers starting:
echo     Frontend:  http://localhost:3000
echo     API:       http://localhost:3001
echo ============================================
echo.
echo Close the two new terminal windows to stop.
pause
