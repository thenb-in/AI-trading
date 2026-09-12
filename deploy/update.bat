@echo off
REM Launcher only. ALL update logic lives in update.js -- one cross-OS
REM implementation, never duplicated per platform.
node "%~dp0update.js" %*
