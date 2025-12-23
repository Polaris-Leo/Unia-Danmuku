@echo off
chcp 65001 >nul

REM Unia-Danmuku 停止脚本 (Windows)

echo 🛑 停止 Unia-Danmuku 服务...
echo.

REM 查找并停止 Node.js 进程
for /f "tokens=2" %%a in ('tasklist ^| findstr /i "node.exe"') do (
    taskkill /PID %%a /F >nul 2>nul
)

echo ✅ 所有服务已停止
echo.
pause
