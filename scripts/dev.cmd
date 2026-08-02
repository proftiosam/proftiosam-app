@echo off
REM O Node foi instalado nesta sessão e processos já abertos herdaram o PATH
REM antigo. Reinjeta aqui para o servidor de desenvolvimento subir de qualquer
REM terminal, sem depender de reiniciar a máquina.
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0.."
call npm run dev
