@echo off
rem Double-click to install, run backend + frontend, and open the browser.
rem Options are passed through, e.g.  run.bat -Reset  /  run.bat -NoBrowser
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0run.ps1" %*
if errorlevel 1 pause
