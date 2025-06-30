# Скрипт для развертывания GymBro локально
Write-Host "🚀 Развертывание GymBro..." -ForegroundColor Green

# Проверяем наличие Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js найден: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js не найден. Установите Node.js с https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Устанавливаем зависимости
Write-Host "📦 Устанавливаем зависимости..." -ForegroundColor Yellow
npm install

# Собираем проект
Write-Host "🔨 Собираем проект..." -ForegroundColor Yellow
npm run build

# Проверяем наличие serve
try {
    serve --version | Out-Null
    Write-Host "✅ Serve найден" -ForegroundColor Green
} catch {
    Write-Host "📦 Устанавливаем serve..." -ForegroundColor Yellow
    npm install -g serve
}

# Получаем IP адрес
$ipAddress = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*" -or $_.IPAddress -like "172.*"} | Select-Object -First 1).IPAddress

Write-Host "🌐 Запускаем сервер..." -ForegroundColor Green
Write-Host "📱 Для доступа с телефона используйте: http://$ipAddress`:3000" -ForegroundColor Cyan
Write-Host "💻 Для доступа с компьютера используйте: http://localhost:3000" -ForegroundColor Cyan
Write-Host "🛑 Для остановки нажмите Ctrl+C" -ForegroundColor Yellow

# Запускаем сервер
serve -s dist -l 3000 