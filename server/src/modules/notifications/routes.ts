import { ReminderStatus, Role } from '@prisma/client';
import createError from 'http-errors';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/role';
import { asyncHandler } from '../../utils/http';
import { dispatchDueReminders } from './reminder.service';

const registerTokenSchema = z.object({
  token: z.string().min(10)
});

const reminderSchema = z.object({
  lessonId: z.string().uuid(),
  minutesBefore: z.number().int().min(5).max(24 * 60)
});

export const notificationsRouter = Router();

notificationsRouter.post(
  '/tokens',
  requireAuth,
  asyncHandler(async (req, res) => {
    const payload = registerTokenSchema.parse(req.body);
    const authUser = req.authUser;
    if (!authUser) {
      throw createError(401, 'Unauthorized');
    }

    const token = await prisma.pushToken.upsert({
      where: { token: payload.token },
      update: { userId: authUser.id },
      create: {
        token: payload.token,
        userId: authUser.id
      }
    });

    res.status(201).json({ token });
  })
);

notificationsRouter.post(
  '/reminders',
  requireAuth,
  requireRole(Role.PATIENT),
  asyncHandler(async (req, res) => {
    const payload = reminderSchema.parse(req.body);
    const authUser = req.authUser;
    if (!authUser) {
      throw createError(401, 'Unauthorized');
    }

    const lesson = await prisma.lesson.findUnique({ where: { id: payload.lessonId } });
    if (!lesson) {
      throw createError(404, 'Урок не найден');
    }

    const lessonDate = new Date(lesson.date);
    lessonDate.setHours(9, 0, 0, 0);
    const remindAt = new Date(lessonDate.getTime() - payload.minutesBefore * 60 * 1000);

    const reminder = await prisma.lessonReminder.create({
      data: {
        userId: authUser.id,
        lessonId: lesson.id,
        remindAt,
        status: ReminderStatus.PENDING
      }
    });

    res.status(201).json({
      reminder: {
        id: reminder.id,
        userId: reminder.userId,
        lessonId: reminder.lessonId,
        remindAt: reminder.remindAt.toISOString(),
        status: reminder.status
      }
    });
  })
);

notificationsRouter.get(
  '/reminders',
  requireAuth,
  asyncHandler(async (req, res) => {
    const authUser = req.authUser;
    if (!authUser) {
      throw createError(401, 'Unauthorized');
    }

    const where = authUser.role === Role.ADMIN ? {} : { userId: authUser.id };

    const reminders = await prisma.lessonReminder.findMany({
      where,
      orderBy: { remindAt: 'asc' },
      include: {
        lesson: {
          select: { id: true, title: true, date: true }
        }
      }
    });

    res.json({
      reminders: reminders.map((item) => ({
        id: item.id,
        userId: item.userId,
        lessonId: item.lessonId,
        lessonTitle: item.lesson.title,
        lessonDate: item.lesson.date.toISOString().slice(0, 10),
        remindAt: item.remindAt.toISOString(),
        status: item.status
      }))
    });
  })
);

notificationsRouter.post(
  '/dispatch',
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (_req, res) => {
    const result = await dispatchDueReminders();
    res.json(result);
  })
);
