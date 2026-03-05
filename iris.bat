@echo off
setlocal

if "%1" == "stop" goto stop
if "%1" == "kill" goto stop
if "%1" == "restart" goto restart

:start
echo [IRIS] Launching Backend invisibly...
powershell -WindowStyle Hidden -Command "Start-Process cmd -ArgumentList '/c npm start' -WindowStyle Hidden"
timeout /t 2 /nobreak > nul

echo [IRIS] Launching Dashboard invisibly...
powershell -WindowStyle Hidden -Command "Start-Process cmd -ArgumentList '/c npm run dev' -WorkingDirectory 'IRIS Frontend Design' -WindowStyle Hidden"
timeout /t 5 /nobreak > nul

echo [IRIS] Opening Browser...
start http://localhost:5173
echo.
echo [IRIS] System is booting. Close this window to keep IRIS running in the background.
echo [IRIS] Run 'iris stop' to shut down all processes.
goto end

:stop
echo [IRIS] Shutting down IRIS processes (Ports 3000 and 5173)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do taskkill /F /PID %%a > nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING') do taskkill /F /PID %%a > nul 2>&1
powershell -Command "Get-Process mcp-remote,duckduckgo-mcp-server,notebooklm-mcp -ErrorAction SilentlyContinue | Stop-Process -Force" > nul 2>&1
echo [IRIS] Offline.
goto end

:restart
call %0 stop
timeout /t 2 /nobreak > nul
call %0 start
goto end

:usage
echo Usage: iris [start ^| stop ^| restart]
echo.
echo   start   - Launches Backend, Dashboard, and Browser
echo   stop    - Cleanly kills all IRIS-related processes
echo   restart - Cycles the system

:end
endlocal
