@echo off
:: Stop all VidyAI services
setlocal

for /f %%a in ('echo prompt $E ^| cmd') do set ESC=%%a
set CYAN=%ESC%[36m
set GREEN=%ESC%[32m
set NC=%ESC%[0m

echo %CYAN%[stop]%NC% Stopping app services...
taskkill /F /FI "WINDOWTITLE eq VidyAI-Backend"  >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq VidyAI-Frontend" >nul 2>&1

echo %CYAN%[stop]%NC% Stopping Supabase...
supabase stop >nul 2>&1

echo %CYAN%[stop]%NC% Stopping Docker services...
docker compose -f "%~dp0infra\docker-compose.yml" down >nul 2>&1

echo %GREEN%[  ok ]%NC% All services stopped.
