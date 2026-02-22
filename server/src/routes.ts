import { Router } from 'express';
import { aiRouter } from './modules/ai/routes';
import { authRouter } from './modules/auth/routes';
import { bootstrapRouter } from './modules/bootstrap/routes';
import { chatRouter } from './modules/chat/routes';
import { notificationsRouter } from './modules/notifications/routes';
import { referralsRouter } from './modules/referrals/routes';
import { usersRouter } from './modules/users/routes';
import { weeksRouter } from './modules/weeks/routes';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/ai', aiRouter);
apiRouter.use('/bootstrap', bootstrapRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/weeks', weeksRouter);
apiRouter.use('/chat', chatRouter);
apiRouter.use('/referrals', referralsRouter);
apiRouter.use('/notifications', notificationsRouter);
