import { Role } from '@prisma/client';
import createError from 'http-errors';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/role';
import { asyncHandler } from '../../utils/http';
import { serializeReferral } from '../../utils/serializers';

const updateSchema = z.object({
  active: z.boolean()
});

export const referralsRouter = Router();

function buildCode(fullName: string) {
  const token = fullName.toUpperCase().replace(/[^A-ZА-Я]/g, '').slice(0, 4) || 'DOC';
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${token}${random}`;
}

referralsRouter.post(
  '/',
  requireAuth,
  requireRole(Role.DOCTOR),
  asyncHandler(async (req, res) => {
    const authUser = req.authUser;
    if (!authUser) {
      throw createError(401, 'Unauthorized');
    }

    const doctor = await prisma.user.findUnique({ where: { id: authUser.id } });
    if (!doctor) {
      throw createError(404, 'Врач не найден');
    }

    let code = buildCode(doctor.fullName);
    let exists = await prisma.referralCode.findUnique({ where: { code } });
    while (exists) {
      code = buildCode(doctor.fullName);
      exists = await prisma.referralCode.findUnique({ where: { code } });
    }

    const referral = await prisma.referralCode.create({
      data: {
        code,
        doctorId: doctor.id,
        active: true
      }
    });

    res.status(201).json({ referralCode: serializeReferral(referral) });
  })
);

referralsRouter.patch(
  '/:id',
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const referralId = typeof req.params.id === 'string' ? req.params.id : '';
    if (!referralId) {
      throw createError(400, 'Некорректный referral id');
    }

    const payload = updateSchema.parse(req.body);
    const updated = await prisma.referralCode.update({
      where: { id: referralId },
      data: {
        active: payload.active
      }
    });

    res.json({ referralCode: serializeReferral(updated) });
  })
);

referralsRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const authUser = req.authUser;
    if (!authUser) {
      throw createError(401, 'Unauthorized');
    }

    if (authUser.role === Role.DOCTOR) {
      const items = await prisma.referralCode.findMany({
        where: { doctorId: authUser.id },
        orderBy: { createdAt: 'desc' }
      });
      res.json({ referralCodes: items.map(serializeReferral) });
      return;
    }

    if (authUser.role === Role.ADMIN) {
      const items = await prisma.referralCode.findMany({
        orderBy: { createdAt: 'desc' }
      });
      res.json({ referralCodes: items.map(serializeReferral) });
      return;
    }

    res.json({ referralCodes: [] });
  })
);
