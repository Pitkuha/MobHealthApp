import { Role } from '@prisma/client';
import createError from 'http-errors';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { requireAuth } from '../../middleware/auth';
import { asyncHandler } from '../../utils/http';
import { serializeMessage } from '../../utils/serializers';
const sendSchema = z.object({
    toId: z.string().uuid(),
    text: z.string().min(1).max(2000)
});
export const chatRouter = Router();
async function canMessage(firstId, secondId) {
    const first = await prisma.user.findUnique({ where: { id: firstId } });
    const second = await prisma.user.findUnique({ where: { id: secondId } });
    if (!first || !second) {
        return false;
    }
    if (first.role === Role.ADMIN || second.role === Role.ADMIN) {
        return false;
    }
    if (first.role === Role.DOCTOR && second.role === Role.PATIENT) {
        const link = await prisma.doctorPatientLink.findUnique({
            where: {
                doctorId_patientId: {
                    doctorId: first.id,
                    patientId: second.id
                }
            }
        });
        return Boolean(link);
    }
    if (first.role === Role.PATIENT && second.role === Role.DOCTOR) {
        const link = await prisma.doctorPatientLink.findUnique({
            where: {
                doctorId_patientId: {
                    doctorId: second.id,
                    patientId: first.id
                }
            }
        });
        return Boolean(link);
    }
    return false;
}
chatRouter.post('/messages', requireAuth, asyncHandler(async (req, res) => {
    const authUser = req.authUser;
    if (!authUser) {
        throw createError(401, 'Unauthorized');
    }
    if (authUser.role === Role.ADMIN) {
        throw createError(403, 'Администратор не может отправлять сообщения');
    }
    const payload = sendSchema.parse(req.body);
    const allowed = await canMessage(authUser.id, payload.toId);
    if (!allowed) {
        throw createError(403, 'Нет доступа к этому диалогу');
    }
    const message = await prisma.chatMessage.create({
        data: {
            fromId: authUser.id,
            toId: payload.toId,
            text: payload.text.trim()
        }
    });
    res.status(201).json({ message: serializeMessage(message) });
}));
chatRouter.get('/messages', requireAuth, asyncHandler(async (req, res) => {
    const authUser = req.authUser;
    if (!authUser) {
        throw createError(401, 'Unauthorized');
    }
    const withUserId = req.query.withUserId;
    if (typeof withUserId !== 'string') {
        throw createError(400, 'Query param withUserId is required');
    }
    if (authUser.role !== Role.ADMIN) {
        const allowed = await canMessage(authUser.id, withUserId);
        if (!allowed) {
            throw createError(403, 'Нет доступа к этому диалогу');
        }
    }
    const messages = await prisma.chatMessage.findMany({
        where: {
            OR: [
                { fromId: authUser.id, toId: withUserId },
                { fromId: withUserId, toId: authUser.id }
            ]
        },
        orderBy: { createdAt: 'asc' }
    });
    res.json({ messages: messages.map(serializeMessage) });
}));
