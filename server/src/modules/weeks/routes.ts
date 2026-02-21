import { Role } from '@prisma/client';
import createError from 'http-errors';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/role';
import { asyncHandler } from '../../utils/http';
import { serializeWeek } from '../../utils/serializers';

const updateLessonSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().min(2).optional(),
  date: z.string().optional(),
  durationMin: z.number().int().positive().optional(),
  audioUrl: z.string().url().optional()
});

export const weeksRouter = Router();

weeksRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (_req, res) => {
    const weeks = await prisma.weekProgram.findMany({
      include: {
        lessons: {
          orderBy: {
            date: 'asc'
          }
        }
      },
      orderBy: {
        weekNumber: 'asc'
      }
    });

    res.json({
      weeks: weeks.map((week) => serializeWeek(week, week.lessons))
    });
  })
);

weeksRouter.patch(
  '/lessons/:lessonId',
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const lessonId = typeof req.params.lessonId === 'string' ? req.params.lessonId : '';
    if (!lessonId) {
      throw createError(400, 'Некорректный lesson id');
    }

    const payload = updateLessonSchema.parse(req.body);

    const parsedDate = payload.date ? new Date(payload.date) : undefined;
    if (payload.date && Number.isNaN(parsedDate?.valueOf())) {
      throw createError(400, 'Некорректная дата, ожидается YYYY-MM-DD');
    }

    const lesson = await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        title: payload.title,
        description: payload.description,
        date: parsedDate,
        durationMin: payload.durationMin,
        audioUrl: payload.audioUrl
      },
      include: {
        weekProgram: true
      }
    });

    res.json({
      lesson: {
        id: lesson.id,
        weekNumber: lesson.weekProgram.weekNumber,
        title: lesson.title,
        description: lesson.description,
        date: lesson.date.toISOString().slice(0, 10),
        audioUrl: lesson.audioUrl,
        durationMin: lesson.durationMin
      }
    });
  })
);
