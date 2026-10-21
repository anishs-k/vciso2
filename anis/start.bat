@echo off
rem Anis: Docker ke Postgres se data download. Double-click to start; close this window to stop.
title Anis - Docker DB Download (port 4700)
cd /d "%~dp0"
start "" http://127.0.0.1:4700
node server.js
pause
