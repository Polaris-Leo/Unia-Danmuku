# 快速启动命令参考

## Windows 系统

### 一键启动
```cmd
start.bat          # 启动服务
stop.bat           # 停止服务
```

### Windows 服务（开机自启）
```powershell
# 管理员权限运行 PowerShell

# 安装服务
.\install-windows-service.ps1

# 管理服务
net start UniaDanmuku      # 启动
net stop UniaDanmuku       # 停止
sc query UniaDanmuku       # 查看状态

# 卸载服务
.\uninstall-windows-service.ps1
```

---

## Linux/Mac 系统

### 一键启动
```bash
./start.sh         # 启动服务
./stop.sh          # 停止服务
```

### systemd 服务（开机自启）
```bash
# 安装服务
sudo cp unia-danmuku.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable unia-danmuku
sudo systemctl start unia-danmuku

# 管理服务
sudo systemctl start unia-danmuku      # 启动
sudo systemctl stop unia-danmuku       # 停止
sudo systemctl restart unia-danmuku    # 重启
sudo systemctl status unia-danmuku     # 状态
sudo journalctl -u unia-danmuku -f     # 日志
```

### PM2 进程管理
```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start backend/src/server.js --name unia-danmuku

# 开机自启
pm2 startup
pm2 save

# 管理服务
pm2 status                  # 状态
pm2 logs unia-danmuku       # 日志
pm2 restart unia-danmuku    # 重启
pm2 stop unia-danmuku       # 停止
pm2 delete unia-danmuku     # 删除
```

---

## 开发环境

### 启动开发服务器
```bash
# 后端（端口 3001）
cd backend
npm run dev

# 前端（端口 5173）
cd frontend
npm run dev
```

---

## 生产环境部署

### 构建前端
```bash
cd frontend
npm run build
```

### 配置环境变量
编辑 `backend/.env`:
```env
PORT=3001
FRONTEND_URL=http://your-domain.com
NODE_ENV=production
```

---

## 常用路径

- **前端页面**: http://localhost:5173 或 http://your-domain.com
- **后端 API**: http://localhost:3001/api
- **健康检查**: http://localhost:3001/api/health
- **OBS 弹幕页**: http://localhost:5173/obs-danmaku
- **日志文件**: logs/backend.log

---

## 快速故障排查

```bash
# 检查端口占用
netstat -ano | findstr :3001        # Windows
lsof -i :3001                       # Linux/Mac

# 查看日志
type logs\backend.log               # Windows
tail -f logs/backend.log            # Linux/Mac

# 检查 Node 进程
tasklist | findstr node             # Windows
ps aux | grep node                  # Linux/Mac
```

---

## 文档链接

- 完整文档: [README.md](README.md)
- 部署指南: [DEPLOYMENT.md](DEPLOYMENT.md)
