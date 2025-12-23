@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM Unia-Danmuku 一键启动脚本 (Windows)

echo 🚀 启动 Unia-Danmuku 弹幕系统...
echo.

REM 检查 Node.js 是否安装
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 错误: 未检测到 Node.js，请先安装 Node.js
    pause
    exit /b 1
)

REM 检查 npm 是否安装
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 错误: 未检测到 npm，请先安装 npm
    pause
    exit /b 1
)

REM 检查并安装依赖
echo 📦 检查依赖...

if not exist "backend\node_modules" (
    echo 📥 安装后端依赖...
    cd backend
    call npm install
    cd ..
)

if not exist "frontend\node_modules" (
    echo 📥 安装前端依赖...
    cd frontend
    call npm install
    cd ..
)

REM 构建前端
echo 🔨 构建前端...
cd frontend
call npm run build
cd ..

REM 检查环境变量文件
if not exist "backend\.env" (
    echo ⚠️  警告: backend\.env 文件不存在，创建默认配置...
    (
        echo PORT=3001
        echo FRONTEND_URL=http://localhost:5173
    ) > backend\.env
)

REM 创建日志目录
if not exist "logs" mkdir logs

REM 启动后端服务
echo ✅ 启动后端服务...
cd backend
start "Unia-Danmuku Backend" /MIN cmd /c "npm start > ..\logs\backend.log 2>&1"
cd ..

echo.
echo ✅ 服务已启动！
echo 📋 日志文件: logs\backend.log
echo 🌐 后端地址: http://localhost:3001
echo 🎉 前端静态文件: frontend\dist
echo.
echo 💡 提示: 运行 stop.bat 停止服务
echo.
pause
