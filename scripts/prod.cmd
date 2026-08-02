@echo off
REM Compila e serve a versão de produção. É esta que representa a velocidade
REM real do app — o modo de desenvolvimento compila cada tela na primeira
REM visita e engana a avaliação.
REM
REM Nunca rode isto com o servidor de desenvolvimento no ar: os dois escrevem
REM na mesma pasta .next e um derruba o outro.
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0.."
call npm run build || exit /b 1
call npm run start
