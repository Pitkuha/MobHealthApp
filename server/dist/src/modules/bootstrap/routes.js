import { Role } from '@prisma/client';
import createError from 'http-errors';
import { Router } from 'express';
import { prisma } from '../../db/prisma';
import { requireAuth } from '../../middleware/auth';
import { asyncHandler } from '../../utils/http';
import { serializeLink, serializeMessage, serializeReferral, serializeUser, serializeWeek } from '../../utils/serializers';
export const bootstrapRouter = Router();
bootstrapRouter.get('/', requireAuth, asyncHandler(async (req, res) => {
    const authUser = req.authUser;
    if (!authUser) {
        throw createError(401, 'Unauthorized');
    }
    const currentUser = await prisma.user.findUnique({ where: { id: authUser.id } });
    if (!currentUser) {
        throw createError(401, 'Unauthorized');
    }
    const weekPrograms = await prisma.weekProgram.findMany({
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
    let users = [currentUser];
    let messages = [];
    let links = [];
    let referralCodes = [];
    if (currentUser.role === Role.PATIENT) {
        links = await prisma.doctorPatientLink.findMany({ where: { patientId: currentUser.id } });
        const doctorIds = links.map((link) => link.doctorId);
        const doctors = doctorIds.length
            ? await prisma.user.findMany({ where: { id: { in: doctorIds } } })
            : [];
        users = [currentUser, ...doctors];
        messages = await prisma.chatMessage.findMany({
            where: {
                OR: [
                    { fromId: currentUser.id },
                    { toId: currentUser.id }
                ]
            },
            orderBy: {
                createdAt: 'asc'
            }
        });
    }
    if (currentUser.role === Role.DOCTOR) {
        links = await prisma.doctorPatientLink.findMany({ where: { doctorId: currentUser.id } });
        const patientIds = links.map((link) => link.patientId);
        const patients = patientIds.length
            ? await prisma.user.findMany({ where: { id: { in: patientIds } } })
            : [];
        users = [currentUser, ...patients];
        messages = await prisma.chatMessage.findMany({
            where: {
                OR: [
                    { fromId: currentUser.id },
                    { toId: currentUser.id }
                ]
            },
            orderBy: {
                createdAt: 'asc'
            }
        });
        referralCodes = await prisma.referralCode.findMany({
            where: { doctorId: currentUser.id },
            orderBy: { createdAt: 'desc' }
        });
    }
    if (currentUser.role === Role.ADMIN) {
        users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
        messages = await prisma.chatMessage.findMany({ orderBy: { createdAt: 'asc' } });
        links = await prisma.doctorPatientLink.findMany({ orderBy: { createdAt: 'asc' } });
        referralCodes = await prisma.referralCode.findMany({ orderBy: { createdAt: 'desc' } });
    }
    res.json({
        currentUser: serializeUser(currentUser),
        users: users.map(serializeUser),
        weeks: weekPrograms.map((week) => serializeWeek(week, week.lessons)),
        messages: messages.map(serializeMessage),
        links: links.map(serializeLink),
        referralCodes: referralCodes.map(serializeReferral)
    });
}));
