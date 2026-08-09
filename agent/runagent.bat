@echo off
rem Wrapper voor Windows Task Scheduler — logt naar logs\agent-YYYY-MM-DD.log
cd /d %~dp0
if not exist logs mkdir logs
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd"') do set TODAY=%%i
node --env-file=.env trading212-agent.mjs >> logs\agent-%TODAY%.log 2>&1
exit /b %ERRORLEVEL%
