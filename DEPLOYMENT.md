# Развертывание GymBro для автономного использования

## Вариант 1: PWA (Progressive Web App) - Рекомендуемый

### Шаг 1: Создание иконок
1. Создайте PNG иконки:
   - `public/icon-192.png` (192x192 пикселей)
   - `public/icon-512.png` (512x512 пикселей)
   
   Рекомендации:
   - Фон: фиолетовый (#8b5cf6)
   - Символ: белая гантель или вес
   - Можно использовать онлайн генераторы: https://www.favicon-generator.org/

### Шаг 2: Развертывание на хостинге

#### Вариант A: Netlify (Бесплатно)
1. Зарегистрируйтесь на https://netlify.com
2. Подключите ваш GitHub репозиторий
3. Настройки сборки:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Домен будет: `https://your-app-name.netlify.app`

#### Вариант B: Vercel (Бесплатно)
1. Зарегистрируйтесь на https://vercel.com
2. Подключите ваш GitHub репозиторий
3. Автоматически определит настройки
4. Домен будет: `https://your-app-name.vercel.app`

#### Вариант C: Firebase Hosting (Бесплатно)
1. Установите Firebase CLI: `npm install -g firebase-tools`
2. Войдите: `firebase login`
3. Инициализируйте проект: `firebase init hosting`
4. Соберите проект: `npm run build`
5. Разверните: `firebase deploy`

### Шаг 3: Установка на телефон

#### Android (Chrome):
1. Откройте сайт в Chrome
2. Нажмите "Установить приложение" в меню
3. Или нажмите ⋮ → "Добавить на главный экран"

#### iPhone (Safari):
1. Откройте сайт в Safari
2. Нажмите кнопку "Поделиться" (квадрат со стрелкой)
3. Выберите "На экран «Домой»"

## Вариант 2: Локальный сервер для личного использования

### Шаг 1: Сборка проекта
```bash
npm run build
```

### Шаг 2: Запуск локального сервера
```bash
# Установите serve глобально
npm install -g serve

# Запустите сервер
serve -s dist -l 3000
```

### Шаг 3: Доступ с телефона
1. Узнайте IP адрес компьютера в локальной сети
2. На телефоне откройте: `http://IP-АДРЕС:3000`
3. Добавьте в закладки браузера

## Вариант 3: Docker контейнер

### Создайте Dockerfile:
```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### nginx.conf:
```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;
        
        location / {
            try_files $uri $uri/ /index.html;
        }
        
        location /sw.js {
            add_header Cache-Control "no-cache";
        }
    }
}
```

### Сборка и запуск:
```bash
docker build -t gymbro .
docker run -p 80:80 gymbro
```

## Проверка PWA

После развертывания проверьте:
1. Lighthouse в Chrome DevTools → PWA score должен быть 90+
2. В Chrome DevTools → Application → Manifest
3. В Chrome DevTools → Application → Service Workers

## Обновления

Для обновления приложения:
1. Внесите изменения в код
2. Соберите проект: `npm run build`
3. Разверните заново на хостинге
4. Пользователи получат обновление автоматически

## Офлайн работа

Приложение будет работать офлайн благодаря Service Worker:
- Кэширует основные файлы
- Сохраняет данные в Firebase (когда есть интернет)
- Показывает кэшированную версию без интернета 