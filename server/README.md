# MobHealth Backend

Express + Prisma + PostgreSQL API для мобильного приложения.

## Запуск
```bash
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:seed
npm run dev
```

## Основные маршруты
- `POST /api/auth/login`
- `POST /api/auth/register-patient`
- `GET /api/bootstrap`
- `PATCH /api/users/me`
- `PATCH /api/users/:id` (admin)
- `PATCH /api/weeks/lessons/:lessonId` (admin)
- `POST /api/chat/messages`
- `POST /api/referrals` (doctor)
- `PATCH /api/referrals/:id` (admin)
- `POST /api/notifications/tokens`
- `POST /api/notifications/reminders` (patient)
- `POST /api/notifications/dispatch` (admin)

## Тесты
```bash
npm run typecheck
npm run test
```
