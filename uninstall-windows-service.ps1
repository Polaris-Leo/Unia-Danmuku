# Unia-Danmuku Windows 服务卸载脚本
# 需要管理员权限运行

# 检查是否以管理员身份运行
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "❌ 错误: 此脚本需要管理员权限" -ForegroundColor Red
    Write-Host "💡 请右键点击 PowerShell 并选择'以管理员身份运行'" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "🗑️  卸载 Unia-Danmuku Windows 服务..." -ForegroundColor Yellow
Write-Host ""

$serviceName = "UniaDanmuku"

# 检查服务是否存在
$service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if (-not $service) {
    Write-Host "⚠️  服务不存在: $serviceName" -ForegroundColor Yellow
    pause
    exit 0
}

# 创建服务卸载脚本
$scriptPath = $PSScriptRoot
$uninstallScript = @"
const Service = require('node-windows').Service;
const path = require('path');

const svc = new Service({
  name: '$serviceName',
  script: path.join(__dirname, 'backend', 'src', 'server.js')
});

svc.on('uninstall', function() {
  console.log('✅ 服务卸载成功');
});

svc.on('error', function(err) {
  console.error('❌ 卸载错误:', err);
});

svc.uninstall();
"@

$uninstallScriptPath = Join-Path $scriptPath "uninstall-service-temp.js"
$uninstallScript | Out-File -FilePath $uninstallScriptPath -Encoding UTF8

# 停止服务
Write-Host "🔄 停止服务..." -ForegroundColor Cyan
Stop-Service -Name $serviceName -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# 运行卸载脚本
Write-Host "📝 卸载服务..." -ForegroundColor Cyan
node $uninstallScriptPath

Start-Sleep -Seconds 3

# 清理临时文件
Remove-Item $uninstallScriptPath -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "✅ 服务卸载完成！" -ForegroundColor Green
Write-Host ""
pause
