#!/bin/bash

# Unia-Danmuku 一键启动脚本 (Linux/Mac)

echo "🚀 启动 Unia-Danmuku 弹幕系统..."

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未检测到 Node.js，请先安装 Node.js"
    exit 1
fi

# 检查 npm 是否安装
if ! command -v npm &> /dev/null; then
    echo "❌ 错误: 未检测到 npm，请先安装 npm"
    exit 1
fi

# 检查并安装依赖
echo "📦 检查依赖..."

if [ ! -d "backend/node_modules" ]; then
    echo "📥 安装后端依赖..."
    cd backend
    npm install
    cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "📥 安装前端依赖..."
    cd frontend
    npm install
    cd ..
fi

# 构建前端
echo "🔨 构建前端..."
cd frontend
npm run build
cd ..

# 检查环境变量文件
if [ ! -f "backend/.env" ]; then
    echo "⚠️  警告: backend/.env 文件不存在，创建默认配置..."
    cat > backend/.env << EOF
PORT=3001
FRONTEND_URL=http://localhost:5173
EOF
fi

# 启动后端服务
echo "✅ 启动后端服务..."
cd backend
nohup npm start > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > ../logs/backend.pid
cd ..

echo "✅ 服务已启动！"
echo "📝 后端进程 PID: $BACKEND_PID"
echo "📋 日志文件: logs/backend.log"
echo "🌐 后端地址: http://localhost:3001"
echo "🎉 前端静态文件: frontend/dist"
echo ""
echo "💡 提示: 使用 ./stop.sh 停止服务"
