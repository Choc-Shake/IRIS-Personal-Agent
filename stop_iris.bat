@echo off
setlocal
echo [IRIS] Shutting down IRIS processes (Ports 3000 and 5173)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do taskkill /F /PID %%a > nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING') do taskkill /F /PID %%a > nul 2>&1
 powershell -Command "Get-Process mcp-remote,duckduckgo-mcp-server,notebooklm-mcp -ErrorAction SilentlyContinue | Stop-Process -Force" > nul 2>&1
echo [IRIS] Offline.
timeout /t 3
endlocal
