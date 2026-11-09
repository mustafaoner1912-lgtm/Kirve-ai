@echo off
setlocal
cd /d "%~dp0"
echo ========================================
echo           KIRVE AI KURULUM
echo ========================================
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 22 veya ustu kurulu degil. https://nodejs.org adresinden kur.
  pause
  exit /b 1
)
node -e "const v=process.versions.node.split('.').map(Number); if(v[0]<22) process.exit(1)"
if errorlevel 1 (
  echo Node.js 22 veya ustu gerekli.
  pause
  exit /b 1
)
if not exist .env (
  echo Bagimliliklar yukleniyor...
  call npm install --no-audit --no-fund
  if errorlevel 1 goto :error
  node scripts\setup.mjs
  if errorlevel 1 goto :error
) else (
  echo Mevcut .env korundu; yeniden yazilmadi.
  call npm install --no-audit --no-fund
  if errorlevel 1 goto :error
)
echo KIRVE AI baslatiliyor. Durdurmak icin CTRL+C.
call npm run start:production
exit /b %errorlevel%
:error
echo Kurulumda hata olustu. Yukaridaki hata mesajini kontrol et.
pause
exit /b 1
