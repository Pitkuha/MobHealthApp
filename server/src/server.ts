import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './db/prisma';
import { startReminderCron } from './modules/notifications/cron';

async function start() {
  const app = createApp();

  await prisma.$connect();
  const cronTask = startReminderCron();

  const server = app.listen(env.port, () => {
    console.log(`Backend API started on http://localhost:${env.port}`);
  });

  const gracefulShutdown = async () => {
    cronTask.stop();
    await prisma.$disconnect();
    server.close(() => process.exit(0));
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
}

start().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
