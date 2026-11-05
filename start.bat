@echo off
chcp 65001 >nul
title Haxball Multiplayer Sunucusu
cd /d "%~dp0"

if not exist node_modules (
    echo Moduller bulunamadi, yukleniyor...
    call npm install
)

echo Sunucu calistiriliyor...
echo Tarayici aciliyor: http://localhost:3000
start "" http://localhost:3000
node server.js
pause
