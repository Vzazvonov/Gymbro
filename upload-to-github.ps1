# Скрипт для загрузки GymBro на GitHub
Write-Host "🚀 Загрузка GymBro на GitHub..." -ForegroundColor Green

# Проверяем наличие Git
try {
    $gitVersion = git --version
    Write-Host "✅ Git найден: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Git не найден. Установите Git с https://git-scm.com/" -ForegroundColor Red
    Write-Host "Или используйте GitHub Desktop: https://desktop.github.com/" -ForegroundColor Yellow
    exit 1
}

# Проверяем, инициализирован ли Git
if (-not (Test-Path ".git")) {
    Write-Host "📁 Инициализируем Git репозиторий..." -ForegroundColor Yellow
    git init
}

# Создаем .gitignore файл
Write-Host "📝 Создаем .gitignore..." -ForegroundColor Yellow
@"
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist/
build/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Logs
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# nyc test coverage
.nyc_output

# Dependency directories
jspm_packages/

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env
"@ | Out-File -FilePath ".gitignore" -Encoding UTF8

# Добавляем все файлы
Write-Host "📦 Добавляем файлы в Git..." -ForegroundColor Yellow
git add .

# Делаем первый коммит
Write-Host "💾 Создаем первый коммит..." -ForegroundColor Yellow
git commit -m "Initial commit: GymBro workout app with PWA support"

Write-Host "✅ Локальный репозиторий готов!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Следующие шаги:" -ForegroundColor Cyan
Write-Host "1. Создайте репозиторий на GitHub: https://github.com/new" -ForegroundColor White
Write-Host "2. Назовите его: gymbro-app" -ForegroundColor White
Write-Host "3. НЕ инициализируйте с README (у вас уже есть файлы)" -ForegroundColor White
Write-Host "4. Скопируйте URL репозитория" -ForegroundColor White
Write-Host "5. Выполните команды:" -ForegroundColor White
Write-Host ""
Write-Host "   git remote add origin https://github.com/YOUR_USERNAME/gymbro-app.git" -ForegroundColor Yellow
Write-Host "   git branch -M main" -ForegroundColor Yellow
Write-Host "   git push -u origin main" -ForegroundColor Yellow
Write-Host ""
Write-Host "🔗 Или используйте GitHub Desktop для простой загрузки!" -ForegroundColor Green 