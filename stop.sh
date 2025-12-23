#!/bin/bash

# Unia-Danmuku 停止脚本 (Linux/Mac)

echo "🛑 停止 Unia-Danmuku 服务..."

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# 停止后端服务
if [ -f "logs/backend.pid" ]; then
    BACKEND_PID=$(cat logs/backend.pid)
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        echo "🔄 停止后端服务 (PID: $BACKEND_PID)..."
        kill $BACKEND_PID
        rm logs/backend.pid
        echo "✅ 后端服务已停止"
    else
        echo "⚠️  后端服务未运行"
        rm logs/backend.pid
    fi
else
    echo "⚠️  未找到后端进程文件"
fi

echo "✅ 所有服务已停止"
