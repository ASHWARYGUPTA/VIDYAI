@echo off
:: Start local dev infrastructure: Supabase + Redis + RabbitMQ
:: Equivalent of: make dev

setlocal
set ROOT=%~dp0
set ROOT=%ROOT:~0,-1%

for /f %%a in ('echo prompt $E ^| cmd') do set ESC=%%a
set CYAN=%ESC%[36m
set GREEN=%ESC%[32m
set NC=%ESC%[0m

echo %CYAN%[dev]%NC% Starting Supabase...
supabase start
if errorlevel 1 (
    echo Failed to start Supabase. Is it installed? https://supabase.com/docs/guides/cli
    exit /b 1
)

echo %CYAN%[dev]%NC% Starting auxiliary services (Redis, RabbitMQ)...
docker compose -f "%ROOT%\infra\docker-compose.yml" up -d
if errorlevel 1 (
    echo Failed to start Docker services. Is Docker Desktop running?
    exit /b 1
)

echo.
echo %GREEN%[  ok ]%NC% Dev stack ready
echo   Supabase Studio : http://localhost:54323
echo   Postgres        : postgresql://postgres:postgres@localhost:54322/postgres
echo   Redis           : redis://localhost:6379
echo   RabbitMQ UI     : http://localhost:15672  (vidyai / vidyai_dev)
echo.
