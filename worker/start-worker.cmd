@echo off
title Appli Courses - analyse des photos
cd /d "%~dp0.."
node worker\worker.js
pause
