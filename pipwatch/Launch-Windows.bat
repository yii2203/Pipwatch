@echo off
REM Double-click this file to open Pipwatch.
REM
REM If Chrome or Edge is installed, this opens Pipwatch in "app mode" --
REM its own window with no address bar, tabs, or browser chrome, so it
REM looks and feels like a standalone desktop app. It uses a small
REM dedicated browser profile stored right next to this script (in a
REM ".pipwatch-app-profile" folder) so it always opens the same window/data
REM regardless of whatever your regular default browser profile is doing.
REM
REM If neither is found, it falls back to opening index.html in your
REM normal default browser tab, same as before.

setlocal
set "DIR=%~dp0"
set "URL=file:///%DIR:\=/%index.html"
set "PROFILE=%DIR%.pipwatch-app-profile"

set "BROWSER="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "BROWSER=%LocalAppData%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not defined BROWSER if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if not defined BROWSER if exist "%ProgramFiles%\BraveSoftware\Brave-Browser\Application\brave.exe" set "BROWSER=%ProgramFiles%\BraveSoftware\Brave-Browser\Application\brave.exe"
if not defined BROWSER if exist "%LocalAppData%\BraveSoftware\Brave-Browser\Application\brave.exe" set "BROWSER=%LocalAppData%\BraveSoftware\Brave-Browser\Application\brave.exe"

if defined BROWSER (
  start "" "%BROWSER%" --app="%URL%" --window-size=1400,900 --user-data-dir="%PROFILE%"
) else (
  echo No Chrome/Edge/Brave found -- opening in your default browser instead.
  start "" "%DIR%index.html"
)
