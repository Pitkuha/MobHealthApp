# MobHealth App (EN / RU)

## EN — Overview
MobHealth is a medical multi-role application with 3 roles:
- Patient
- Doctor
- Admin

Current architecture:
- Client (single codebase): Expo React Native (iOS/Android/Web)
- Desktop mode: React Native Web (via Expo Web)
- Backend: Java Spring Boot + PostgreSQL

Legacy modules kept in repo:
- `/Users/pitkuha/Desktop/CodexProjects/MobHealthApp/server` (Node.js backend, legacy)
- `/Users/pitkuha/Desktop/CodexProjects/MobHealthApp/desktop` (Electron client, legacy)

## EN — Features
- Role-based auth (`patient / doctor / admin`)
- Weekly lesson programs with audio
- Calendar with lessons
- Profile
- Patient ↔ doctor chat
- Doctor referral codes
- Patient registration by referral code
- Admin data management
- Lesson reminders
- AI assistant sessions (role-based)

## EN — Tech Stack
- Client: Expo, React Native, TypeScript
- Backend: Java 21+, Spring Boot 3, JDBC, Flyway, JWT
- Database: PostgreSQL 16+

## EN — Requirements
- Node.js 20+
- npm 10+
- Java 21+ (you have Java 25, it is OK)
- Maven 3.9+
- PostgreSQL 16+
- Xcode (for iOS simulator)

## EN — Start From Correct Directory
```bash
cd /Users/pitkuha/Desktop/CodexProjects/MobHealthApp
pwd
ls package.json
```

## EN — First Run
### 1) Install dependencies
```bash
cd /Users/pitkuha/Desktop/CodexProjects/MobHealthApp
npm install
```

### 2) Start PostgreSQL
```bash
brew install postgresql@16
brew services start postgresql@16
```

### 3) Start Java backend
```bash
cd /Users/pitkuha/Desktop/CodexProjects/MobHealthApp
npm run server:dev
```

Notes:
- Backend runs on `http://localhost:4000`.
- Flyway migrations run automatically.
- Demo data is seeded automatically if DB is empty.

### 4) Start mobile client (iOS/Android)
```bash
cd /Users/pitkuha/Desktop/CodexProjects/MobHealthApp
npm run start:localhost
```
- Press `i` for iOS simulator
- Press `a` for Android emulator
- If local network mode fails, run:
```bash
npm run start:tunnel
```

### 5) Start desktop client (React Native Web)
```bash
cd /Users/pitkuha/Desktop/CodexProjects/MobHealthApp
npm run desktop:dev
```

## EN — Environment Variables
### Root `.env` (client)
```env
EXPO_PUBLIC_API_URL=http://localhost:4000/api
```

### Optional backend env vars
```env
PORT=4000
DATABASE_URL=postgresql://pitkuha@localhost:5432/mob_health?schema=public
DB_USER=pitkuha
DB_PASSWORD=
JWT_SECRET=change_this_secret
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:8081,http://localhost:5173,http://localhost:19006
```

## EN — Demo Accounts
- Patient: `anna@example.com / patient123`
- Doctor: `e.orlova@clinic.com / doctor123`
- Admin: `admin@mobhealth.app / admin123`
- Referral code: `DRORLOVA10`

## EN — Verification
```bash
curl http://localhost:4000/api/health
npm run typecheck
npm run server:build
npm run server:test
```

## EN — Main Scripts
```bash
# client
npm run start
npm run start:localhost
npm run start:tunnel
npm run web
npm run desktop:dev
npm run desktop:build

# java backend
npm run server:dev
npm run server:build
npm run server:test

# legacy (optional)
npm run server:legacy:dev
npm run server:legacy:typecheck
npm run server:legacy:test
npm run desktop:legacy:dev
```

## EN — Common Issues
1. `npm ERR! enoent ... /Users/pitkuha/package.json`
- you are not in project folder
- run:
```bash
cd /Users/pitkuha/Desktop/CodexProjects/MobHealthApp
ls package.json
```

2. `Failed to fetch` on login
- backend is not running
- wrong `EXPO_PUBLIC_API_URL`
- CORS origin is not allowed

3. `simctl ... timed out`
- use tunnel mode: `npm run start:tunnel`
- check Xcode tools:
```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
open -a Simulator
```

---

## RU — Описание
MobHealth — медицинское приложение с 3 ролями:
- Пациент
- Врач
- Администратор

Текущая архитектура:
- Клиент (единый код): Expo React Native (iOS/Android/Web)
- Desktop-режим: React Native Web (через Expo Web)
- Backend: Java Spring Boot + PostgreSQL

Legacy-модули сохранены:
- `/Users/pitkuha/Desktop/CodexProjects/MobHealthApp/server` (Node.js backend, legacy)
- `/Users/pitkuha/Desktop/CodexProjects/MobHealthApp/desktop` (Electron client, legacy)

## RU — Возможности
- Ролевой вход (`patient / doctor / admin`)
- Недельные программы с аудио-уроками
- Календарь уроков
- Личный кабинет
- Чат пациент ↔ врач
- Реферальные коды врача
- Регистрация пациента по реферальному коду
- Управление данными админом
- Напоминания по урокам
- AI-сессии по ролям

## RU — Стек
- Клиент: Expo, React Native, TypeScript
- Backend: Java 21+, Spring Boot 3, JDBC, Flyway, JWT
- База: PostgreSQL 16+

## RU — Требования
- Node.js 20+
- npm 10+
- Java 21+ (у вас Java 25, подходит)
- Maven 3.9+
- PostgreSQL 16+
- Xcode (для iOS-симулятора)

## RU — Запуск из правильной папки
```bash
cd /Users/pitkuha/Desktop/CodexProjects/MobHealthApp
pwd
ls package.json
```

## RU — Первый запуск
### 1) Установить зависимости
```bash
cd /Users/pitkuha/Desktop/CodexProjects/MobHealthApp
npm install
```

### 2) Запустить PostgreSQL
```bash
brew install postgresql@16
brew services start postgresql@16
```

### 3) Запустить Java backend
```bash
cd /Users/pitkuha/Desktop/CodexProjects/MobHealthApp
npm run server:dev
```

Примечания:
- Backend слушает `http://localhost:4000`.
- Flyway миграции применяются автоматически.
- Демо-данные заполняются автоматически, если база пустая.

### 4) Запустить mobile клиент (iOS/Android)
```bash
cd /Users/pitkuha/Desktop/CodexProjects/MobHealthApp
npm run start:localhost
```
- Нажмите `i` для iOS
- Нажмите `a` для Android
- Если LAN/localhost не работает:
```bash
npm run start:tunnel
```

### 5) Запустить desktop клиент (React Native Web)
```bash
cd /Users/pitkuha/Desktop/CodexProjects/MobHealthApp
npm run desktop:dev
```

## RU — Переменные окружения
### Root `.env` (client)
```env
EXPO_PUBLIC_API_URL=http://localhost:4000/api
```

### Опциональные backend env vars
```env
PORT=4000
DATABASE_URL=postgresql://pitkuha@localhost:5432/mob_health?schema=public
DB_USER=pitkuha
DB_PASSWORD=
JWT_SECRET=change_this_secret
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:8081,http://localhost:5173,http://localhost:19006
```

## RU — Демо-аккаунты
- Пациент: `anna@example.com / patient123`
- Врач: `e.orlova@clinic.com / doctor123`
- Админ: `admin@mobhealth.app / admin123`
- Реферальный код: `DRORLOVA10`

## RU — Проверка
```bash
curl http://localhost:4000/api/health
npm run typecheck
npm run server:build
npm run server:test
```

## RU — Основные скрипты
```bash
# client
npm run start
npm run start:localhost
npm run start:tunnel
npm run web
npm run desktop:dev
npm run desktop:build

# java backend
npm run server:dev
npm run server:build
npm run server:test

# legacy (опционально)
npm run server:legacy:dev
npm run server:legacy:typecheck
npm run server:legacy:test
npm run desktop:legacy:dev
```

## RU — Частые проблемы
1. `npm ERR! enoent ... /Users/pitkuha/package.json`
- вы не в папке проекта
- выполните:
```bash
cd /Users/pitkuha/Desktop/CodexProjects/MobHealthApp
ls package.json
```

2. `Failed to fetch` при логине
- backend не запущен
- неверный `EXPO_PUBLIC_API_URL`
- CORS не разрешает origin

3. `simctl ... timed out`
- используйте `npm run start:tunnel`
- проверьте Xcode tools:
```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
open -a Simulator
```
