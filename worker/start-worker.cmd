@echo off
title Appli Courses - analyse des photos
cd /d "%~dp0.."
rem Relance automatique si le script s arrete (coupure reseau, mise en veille...)
:loop
node worker\worker.js
echo Redemarrage dans 30 s...
timeout /t 30 /nobreak >nul
goto loop
