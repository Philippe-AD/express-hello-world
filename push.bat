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

:retry
echo.
echo Envoi vers GitHub...
git push
if %ERRORLEVEL% neq 0 (
    echo.
    echo Echec du push. Nouvelle tentative dans 5 secondes...
    timeout /t 5 >nul
    goto retry
)

echo.
echo ================================
echo   Termine !
echo ================================
echo.
pause
