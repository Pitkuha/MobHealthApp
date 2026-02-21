import { Role } from '@prisma/client';
import createError from 'http-errors';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { requireAuth } from '../../middleware/auth';
import { comparePassword, hashPassword } from '../../utils/password';
import { serializeUser } from '../../utils/serializers';
import { signAccessToken } from '../../utils/jwt';
import { asyncHandler } from '../../utils/http';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const registerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  referralCode: z.string().min(3),
  age: z.number().int().positive().optional()
});

export const authRouter = Router();

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const payload = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: payload.email.toLowerCase() } });
    if (!user) {
      throw createError(401, 'Неверный email или пароль');
    }

    const passwordOk = await comparePassword(payload.password, user.passwordHash);
    if (!passwordOk) {
      throw createError(401, 'Неверный email или пароль');
    }

    const token = signAccessToken({
      id: user.id,
      role: user.role,
      email: user.email
    });

    res.json({
      token,
      user: serializeUser(user)
    });
  })
);

authRouter.post(
  '/register-patient',
  asyncHandler(async (req, res) => {
    const payload = registerSchema.parse(req.body);

    const existed = await prisma.user.findUnique({ where: { email: payload.email.toLowerCase() } });
    if (existed) {
      throw createError(409, 'Пользователь с таким email уже существует');
    }

    const referral = await prisma.referralCode.findFirst({
      where: {
        code: payload.referralCode.toUpperCase(),
        active: true
      },
      include: {
        doctor: true
      }
    });

    if (!referral || referral.doctor.role !== Role.DOCTOR) {
      throw createError(400, 'Реферальный код не найден или недействителен');
    }

    const passwordHash = await hashPassword(payload.password);

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          role: Role.PATIENT,
          fullName: payload.fullName,
          email: payload.email.toLowerCase(),
          passwordHash,
          age: payload.age,
          about: 'Новый пациент, зарегистрированный по коду врача.'
        }
      });

      await tx.doctorPatientLink.create({
        data: {
          doctorId: referral.doctorId,
          patientId: user.id
        }
      });

      await tx.referralCode.update({
        where: { id: referral.id },
        data: {
          active: false,
          usedByPatientId: user.id
        }
      });

      return user;
    });

    const token = signAccessToken({
      id: created.id,
      role: created.role,
      email: created.email
    });

    res.status(201).json({
      token,
      user: serializeUser(created)
    });
  })
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const authUser = req.authUser;
    if (!authUser) {
      throw createError(401, 'Unauthorized');
    }

    const user = await prisma.user.findUnique({ where: { id: authUser.id } });
    if (!user) {
      throw createError(401, 'Unauthorized');
    }

    res.json({ user: serializeUser(user) });
  })
);
