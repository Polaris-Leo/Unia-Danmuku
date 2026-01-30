# Unia-Danmuku Windows 服务安装脚本
# 需要管理员权限运行

# 检查是否以管理员身份运行
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "❌ 错误: 此脚本需要管理员权限" -ForegroundColor Red
    Write-Host "💡 请右键点击 PowerShell 并选择'以管理员身份运行'" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "🚀 安装 Unia-Danmuku Windows 服务..." -ForegroundColor Green
Write-Host ""

# 检查 Node.js 是否安装
$nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $nodePath) {
    Write-Host "❌ 错误: 未检测到 Node.js，请先安装 Node.js" -ForegroundColor Red
    pause
    exit 1
}

# 获取当前目录
$scriptPath = $PSScriptRoot
$backendPath = Join-Path $scriptPath "backend\src\server.js"

# 检查服务器文件是否存在
if (-not (Test-Path $backendPath)) {
    Write-Host "❌ 错误: 未找到后端服务文件: $backendPath" -ForegroundColor Red
    pause
    exit 1
}

# 服务名称
$serviceName = "UniaDanmuku"
$displayName = "Unia-Danmuku Danmaku System"
$description = "Bilibili 弹幕系统后端服务"

# 检查服务是否已存在
$existingService = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if ($existingService) {
    Write-Host "⚠️  服务已存在，正在删除旧服务..." -ForegroundColor Yellow
    Stop-Service -Name $serviceName -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    sc.exe delete $serviceName
    Start-Sleep -Seconds 2
}

# 安装 node-windows (用于创建 Windows 服务)
Write-Host "📦 安装 node-windows..." -ForegroundColor Cyan
Set-Location (Join-Path $scriptPath "backend")
npm install node-windows --save
Set-Location $scriptPath

# 创建服务安装脚本
$serviceScript = @"
const Service = require('node-windows').Service;
const path = require('path');

// 创建新的服务对象
const svc = new Service({
  name: '$serviceName',
  description: '$description',
  script: path.join(__dirname, 'backend', 'src', 'server.js'),
  nodeOptions: [
    '--harmony',
    '--max_old_space_size=4096'
  ],
  workingDirectory: path.join(__dirname, 'backend'),
  env: {
    name: 'NODE_ENV',
    value: 'production'
  }
});

// 监听安装事件
svc.on('install', function() {
  console.log('✅ 服务安装成功');
  svc.start();
});

svc.on('start', function() {
  console.log('✅ 服务启动成功');
  console.log('🌐 后端地址: http://localhost:3001');
});

svc.on('error', function(err) {
  console.error('❌ 服务错误:', err);
});

// 安装服务
svc.install();
"@

$serviceScriptPath = Join-Path $scriptPath "install-service-temp.js"
$serviceScript | Out-File -FilePath $serviceScriptPath -Encoding UTF8

# 运行服务安装
Write-Host "📝 创建 Windows 服务..." -ForegroundColor Cyan
node $serviceScriptPath

# 等待服务创建
Start-Sleep -Seconds 5

# 清理临时文件
Remove-Item $serviceScriptPath -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "✅ 服务安装完成！" -ForegroundColor Green
Write-Host ""
Write-Host "📋 服务管理命令:" -ForegroundColor Yellow
Write-Host "  启动服务: net start $serviceName" -ForegroundColor White
Write-Host "  停止服务: net stop $serviceName" -ForegroundColor White
Write-Host "  查看状态: sc query $serviceName" -ForegroundColor White
Write-Host "  卸载服务: 运行 uninstall-windows-service.ps1" -ForegroundColor White
Write-Host ""
Write-Host "💡 服务已设置为开机自启，可以在'服务'管理器中查看" -ForegroundColor Cyan
Write-Host ""
pause
