@echo off
setlocal EnableDelayedExpansion

set ROOT=%~dp0
set ROOT=%ROOT:~0,-1%

:: ── Colors via ANSI (requires Windows 10+) ──────────────────────────────────
for /f %%a in ('echo prompt $E ^| cmd') do set ESC=%%a
set CYAN=%ESC%[36m
set GREEN=%ESC%[32m
set YELLOW=%ESC%[33m
set RED=%ESC%[31m
set NC=%ESC%[0m

echo %CYAN%[start]%NC% VidyAI Dev — starting services...

:: ── Kill leftover processes ──────────────────────────────────────────────────
echo %CYAN%[start]%NC% Stopping any running services...
taskkill /F /FI "WINDOWTITLE eq VidyAI-Backend" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq VidyAI-Frontend" >nul 2>&1

:: ── Verify .env ─────────────────────────────────────────────────────────────
if not exist "%ROOT%\.env" (
    echo %RED%[error]%NC% .env not found at %ROOT%\.env
    exit /b 1
)
if not exist "%ROOT%\apps\web\.env.local" (
    echo %YELLOW%[ warn]%NC% apps\web\.env.local not found — frontend may not connect to Supabase
)

:: ── Log directory ────────────────────────────────────────────────────────────
if not exist "%ROOT%\logs" mkdir "%ROOT%\logs"

:: ── Start Backend (FastAPI) ──────────────────────────────────────────────────
echo %CYAN%[start]%NC% Starting backend on :8000 ...
start "VidyAI-Backend" /min cmd /c ^
    "cd /d "%ROOT%" && for /f "tokens=*" %%i in (.env) do set "%%i" 2>nul & services\api\venv\Scripts\uvicorn services.api.main:app --host 0.0.0.0 --port 8000 --reload >> logs\backend.log 2>&1"

:: ── Start Frontend (Next.js) ─────────────────────────────────────────────────
echo %CYAN%[start]%NC% Starting frontend on :3000 ...
start "VidyAI-Frontend" /min cmd /c ^
    "cd /d "%ROOT%\apps\web" && node_modules\.bin\next dev --port 3000 >> "%ROOT%\logs\frontend.log" 2>&1"

:: ── Wait for services ────────────────────────────────────────────────────────
echo %CYAN%[start]%NC% Waiting for services to come up...
set BACKEND_UP=false
set FRONTEND_UP=false

for /L %%i in (1,1,30) do (
    timeout /t 1 /nobreak >nul
    curl -sf http://localhost:8000/health >nul 2>&1 && set BACKEND_UP=true
    curl -sf http://localhost:3000 >nul 2>&1        && set FRONTEND_UP=true
    if "!BACKEND_UP!"=="true" if "!FRONTEND_UP!"=="true" goto :ready
)

:ready
echo.
if "!BACKEND_UP!"=="true" (
    echo %GREEN%[  ok ]%NC% Backend  ^-^> http://localhost:8000
) else (
    echo %RED%[error]%NC% Backend  failed to start (check logs\backend.log^)
)
if "!FRONTEND_UP!"=="true" (
    echo %GREEN%[  ok ]%NC% Frontend ^-^> http://localhost:3000
) else (
    echo %RED%[error]%NC% Frontend failed to start (check logs\frontend.log^)
)
echo.
echo %CYAN%[start]%NC% Tailing logs... (close this window to stop all services)
echo.

:: ── Tail both logs ───────────────────────────────────────────────────────────
powershell -Command "Get-Content '%ROOT%\logs\backend.log','%ROOT%\logs\frontend.log' -Wait -Tail 20"

:: ── Cleanup on exit ──────────────────────────────────────────────────────────
echo.
echo %CYAN%[start]%NC% Shutting down...
taskkill /F /FI "WINDOWTITLE eq VidyAI-Backend" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq VidyAI-Frontend" >nul 2>&1
echo %GREEN%[  ok ]%NC% All services stopped.
