# MobHealth App (EN / RU)

## EN — Overview
MobHealth is a medical multi-client application with three roles:
- Patient
- Doctor
- Admin

Project parts:
- Mobile client (Expo React Native) — iOS/Android
- Desktop client (Electron + React) — macOS/Windows/Linux
- Backend API (Express + Prisma + PostgreSQL)

## RU — Описание
MobHealth — медицинское мультиклиентское приложение с тремя ролями:
- Пациент
- Врач
- Администратор

Части проекта:
- Мобильный клиент (Expo React Native) — iOS/Android
- Desktop клиент (Electron + React) — macOS/Windows/Linux
- Backend API (Express + Prisma + PostgreSQL)

---

## EN — Features
- Role-based authentication: `patient / doctor / admin`
- Weekly lesson programs (autogenic training)
- Audio lessons
- Lessons calendar
- Profile area
- Patient ↔ doctor chat
- Doctor referral codes
- Patient registration via referral code
- Admin panel: users, lessons, referral codes management
- Lesson reminders (backend reminders + mobile notifications)

## RU — Возможности
- Ролевой вход: `patient / doctor / admin`
- Программы по неделям с уроками (аутогенные тренировки)
- Аудио-уроки
- Календарь уроков
- Личный кабинет
- Чат пациент ↔ врач
- Реферальные коды врача
- Регистрация пациента по коду врача
- Админ-панель: редактирование пользователей, уроков, рефкодов
- Напоминания по урокам (backend reminders + mobile notifications)

---

## EN — Tech Stack
- Mobile: Expo, React Native, TypeScript
- Desktop: Electron, React, Vite, TypeScript
- Backend: Node.js, Express, Prisma
- Database: PostgreSQL

## RU — Стек
- Mobile: Expo, React Native, TypeScript
- Desktop: Electron, React, Vite, TypeScript
- Backend: Node.js, Express, Prisma
- Database: PostgreSQL

---

## EN — Project Structure
- `/Users/pitkuha/Desktop/CodexProjects/MobHealthApp/src` — mobile
- `/Users/pitkuha/Desktop/CodexProjects/MobHealthApp/desktop` — desktop
- `/Users/pitkuha/Desktop/CodexProjects/MobHealthApp/server` — backend

## RU — Структура проекта
- `/Users/pitkuha/Desktop/CodexProjects/MobHealthApp/src` — mobile
- `/Users/pitkuha/Desktop/CodexProjects/MobHealthApp/desktop` — desktop
- `/Users/pitkuha/Desktop/CodexProjects/MobHealthApp/server` — backend

---

## EN — Requirements
- Node.js 20.x (LTS recommended)
- npm 10+
- PostgreSQL 16+
- Xcode (for iOS simulator)

## RU — Требования
- Node.js 20.x (рекомендуется LTS)
- npm 10+
- PostgreSQL 16+
- Xcode (для iOS симулятора)

---

## EN — PostgreSQL Setup (macOS/Homebrew)
```bash
brew install postgresql@16
brew services start postgresql@16
```

## RU — Установка PostgreSQL (macOS/Homebrew)
```bash
brew install postgresql@16
brew services start postgresql@16
```

---

## EN — First Full Run

### 1) Backend
```bash
cd /Users/pitkuha/Desktop/CodexProjects/MobHealthApp/server
cp .env.example .env
npm install
npm run prisma:generate
npx prisma migrate deploy
npm run prisma:seed
npm run dev
```

### 2) Mobile
```bash
cd /Users/pitkuha/Desktop/CodexProjects/MobHealthApp
cp .env.example .env
npm install
npm run start:localhost
```

Press `i` for iOS, `a` for Android.
If LAN/localhost fails, use:
```bash
npm run start:tunnel
```

### 3) Desktop
```bash
cd /Users/pitkuha/Desktop/CodexProjects/MobHealthApp
npm run desktop:install
cd desktop
cp .env.example .env
cd ..
npm run desktop:dev
```

## RU — Первый запуск (полностью)

### 1) Backend
```bash
cd /Users/pitkuha/Desktop/CodexProjects/MobHealthApp/server
cp .env.example .env
npm install
npm run prisma:generate
npx prisma migrate deploy
npm run prisma:seed
npm run dev
```

### 2) Mobile
```bash
cd /Users/pitkuha/Desktop/CodexProjects/MobHealthApp
cp .env.example .env
npm install
npm run start:localhost
```

Для iOS нажмите `i`, для Android нажмите `a`.
Если LAN/localhost не работает, используйте:
```bash
npm run start:tunnel
```

### 3) Desktop
```bash
cd /Users/pitkuha/Desktop/CodexProjects/MobHealthApp
npm run desktop:install
cd desktop
cp .env.example .env
cd ..
npm run desktop:dev
```

---

## EN — Daily Run
- Terminal 1 (backend):
```bash
cd /Users/pitkuha/Desktop/CodexProjects/MobHealthApp/server
npm run dev
```
- Terminal 2 (mobile):
```bash
cd /Users/pitkuha/Desktop/CodexProjects/MobHealthApp
npm run start:localhost
```
- Terminal 3 (desktop):
```bash
cd /Users/pitkuha/Desktop/CodexProjects/MobHealthApp
npm run desktop:dev
```

## RU — Ежедневный запуск
- Терминал 1 (backend):
```bash
cd /Users/pitkuha/Desktop/CodexProjects/MobHealthApp/server
npm run dev
```
- Терминал 2 (mobile):
```bash
cd /Users/pitkuha/Desktop/CodexProjects/MobHealthApp
npm run start:localhost
```
- Терминал 3 (desktop):
```bash
cd /Users/pitkuha/Desktop/CodexProjects/MobHealthApp
npm run desktop:dev
```

---

## EN — Environment Variables

### Root `.env` (mobile)
```env
EXPO_PUBLIC_API_URL=http://localhost:4000/api
```

### `server/.env`
```env
PORT=4000
DATABASE_URL=postgresql://pitkuha@localhost:5432/mob_health?schema=public
JWT_SECRET=change_this_secret
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:8081,http://localhost:5173
EXPO_ACCESS_TOKEN=
```

### `desktop/.env`
```env
VITE_API_URL=http://localhost:4000/api
```

## RU — Переменные окружения

### Root `.env` (mobile)
```env
EXPO_PUBLIC_API_URL=http://localhost:4000/api
```

### `server/.env`
```env
PORT=4000
DATABASE_URL=postgresql://pitkuha@localhost:5432/mob_health?schema=public
JWT_SECRET=change_this_secret
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:8081,http://localhost:5173
EXPO_ACCESS_TOKEN=
```

### `desktop/.env`
```env
VITE_API_URL=http://localhost:4000/api
```

---

## EN — Demo Accounts
- Patient: `anna@example.com / patient123`
- Doctor: `e.orlova@clinic.com / doctor123`
- Admin: `admin@mobhealth.app / admin123`
- Referral code: `DRORLOVA10`

## RU — Демо-аккаунты
- Пациент: `anna@example.com / patient123`
- Врач: `e.orlova@clinic.com / doctor123`
- Админ: `admin@mobhealth.app / admin123`
- Реферальный код: `DRORLOVA10`

---

## EN — Verification
- API health check:
```bash
curl http://localhost:4000/api/health
```
- Typecheck:
```bash
cd /Users/pitkuha/Desktop/CodexProjects/MobHealthApp
npm run typecheck
npm run server:typecheck
npm run desktop:typecheck
```
- Backend tests:
```bash
npm run server:test
```

## RU — Проверка работоспособности
- Проверка API:
```bash
curl http://localhost:4000/api/health
```
- Typecheck:
```bash
cd /Users/pitkuha/Desktop/CodexProjects/MobHealthApp
npm run typecheck
npm run server:typecheck
npm run desktop:typecheck
```
- Тесты backend:
```bash
npm run server:test
```

---

## EN — Main Scripts
```bash
# mobile
npm run start
npm run start:localhost
npm run start:tunnel

# backend
npm run server:dev
npm run server:typecheck
npm run server:test

# desktop
npm run desktop:install
npm run desktop:dev
npm run desktop:typecheck
npm run desktop:build
```

## RU — Основные скрипты
```bash
# mobile
npm run start
npm run start:localhost
npm run start:tunnel

# backend
npm run server:dev
npm run server:typecheck
npm run server:test

# desktop
npm run desktop:install
npm run desktop:dev
npm run desktop:typecheck
npm run desktop:build
```

---

## EN — Common Issues
1. `Failed to fetch` on login:
- backend is not running
- wrong API URL
- CORS blocks origin

2. `simctl openurl ... timed out`:
- use `npm run start:tunnel`
- verify Xcode tools:
```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
open -a Simulator
```

3. Expo SDK package version warning:
- run `npm install` in project root

## RU — Частые проблемы
1. `Failed to fetch` при логине:
- backend не запущен
- неверный API URL
- CORS блокирует origin

2. `simctl openurl ... timed out`:
- используйте `npm run start:tunnel`
- проверьте Xcode tools:
```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
open -a Simulator
```

3. Expo SDK warning о версиях пакетов:
- выполните `npm install` в root

---

## EN — Note
This repository is configured for local development/testing. Production setup should include HTTPS, secret management, strict CORS policy, token rotation, observability, and CI/CD.

## RU — Примечание
Это development-конфигурация для локальной проверки. Для production нужны HTTPS, секреты, ограничение CORS, ротация токенов, мониторинг и CI/CD.
