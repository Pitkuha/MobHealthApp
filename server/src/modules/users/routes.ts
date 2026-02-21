import { Role } from '@prisma/client';
import createError from 'http-errors';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/role';
import { asyncHandler } from '../../utils/http';
import { serializeUser } from '../../utils/serializers';

const patchSchema = z.object({
  fullName: z.string().min(2).optional(),
  email: z.string().email().optional(),
  age: z.number().int().positive().optional().nullable(),
  specialty: z.string().min(2).optional().nullable(),
  about: z.string().max(500).optional().nullable()
});

export const usersRouter = Router();

usersRouter.patch(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const authUser = req.authUser;
    if (!authUser) {
      throw createError(401, 'Unauthorized');
    }

    const payload = patchSchema.parse(req.body);

    const updated = await prisma.user.update({
      where: { id: authUser.id },
      data: {
        fullName: payload.fullName,
        email: payload.email?.toLowerCase(),
        age: payload.age ?? undefined,
        specialty: payload.specialty ?? undefined,
        about: payload.about ?? undefined
      }
    });

    res.json({ user: serializeUser(updated) });
  })
);

usersRouter.patch(
  '/:id',
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const userId = typeof req.params.id === 'string' ? req.params.id : '';
    if (!userId) {
      throw createError(400, 'Некорректный user id');
    }

    const payload = patchSchema.parse(req.body);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        fullName: payload.fullName,
        email: payload.email?.toLowerCase(),
        age: payload.age ?? undefined,
        specialty: payload.specialty ?? undefined,
        about: payload.about ?? undefined
      }
    });

    res.json({ user: serializeUser(updated) });
  })
);

usersRouter.get(
  '/',
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
    res.json({ users: users.map(serializeUser) });
  })
);
