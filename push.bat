@echo off
chcp 65001 >nul
echo.
echo ================================
echo   Mise a jour GitHub
echo ================================
echo.

cd /d "%~dp0"

git add .

set /p MSG="Message du commit : "
if "%MSG%"=="" set MSG=Mise a jour

git commit -m "%MSG%"
git push

echo.
echo ================================
echo   Termine !
echo ================================
echo.
pause
