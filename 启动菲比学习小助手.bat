@echo off
cd /d "%~dp0"
set ELECTRON_RUN_AS_NODE=
if exist "release\workFeiBi\workFeiBi.exe" (
  start "workFeiBi" "%~dp0release\workFeiBi\workFeiBi.exe"
  exit /b 0
)
if not exist "node_modules\electron\dist\electron.exe" (
  echo First start: installing Electron...
  call npm install
  if errorlevel 1 (
    echo Install failed. Please run npm install in this folder.
    pause
    exit /b 1
  )
)
if not exist "node_modules\electron\dist\electron.exe" (
  call node node_modules\electron\install.js
  if errorlevel 1 exit /b 1
)
set ELECTRON_RUN_AS_NODE=
start "workFeiBi" "%~dp0node_modules\electron\dist\electron.exe" "%~dp0"
