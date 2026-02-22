import { Prisma } from '@prisma/client';
import createError from 'http-errors';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { requireAuth } from '../../middleware/auth';
import { asyncHandler } from '../../utils/http';
import { generateAgentReply, getSessionTitle, serializeAiMessage } from './orchestrator';

const chatSchema = z.object({
  message: z.string().min(1).max(4000),
  sessionId: z.string().uuid().optional()
});

export const aiRouter = Router();

aiRouter.use(requireAuth);

aiRouter.post(
  '/chat',
  asyncHandler(async (req, res) => {
    const authUser = req.authUser;
    if (!authUser) {
      throw createError(401, 'Unauthorized');
    }

    const payload = chatSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id: authUser.id }
    });

    if (!user) {
      throw createError(401, 'Unauthorized');
    }

    let session = null as Awaited<ReturnType<typeof prisma.aISession.findUnique>>;

    if (payload.sessionId) {
      session = await prisma.aISession.findUnique({
        where: { id: payload.sessionId }
      });

      if (!session || session.userId !== user.id) {
        throw createError(403, 'No access to this AI session');
      }
    }

    if (!session) {
      session = await prisma.aISession.create({
        data: {
          userId: user.id,
          roleSnapshot: user.role,
          subagent: user.role === 'PATIENT' ? 'PATIENT_COACH' : user.role === 'DOCTOR' ? 'DOCTOR_ASSISTANT' : 'ADMIN_ASSISTANT',
          title: getSessionTitle(payload.message)
        }
      });
    }

    await prisma.aIMessage.create({
      data: {
        sessionId: session.id,
        role: 'USER',
        content: payload.message.trim()
      }
    });

    const contextMessages = await prisma.aIMessage.findMany({
      where: {
        sessionId: session.id
      },
      orderBy: {
        createdAt: 'asc'
      },
      take: 30
    });

    const reply = await generateAgentReply(prisma, user, payload.message.trim(), {
      history: contextMessages.map((item) => ({
        role: item.role,
        content: item.content,
        createdAt: item.createdAt
      }))
    });

    const assistantMessage = await prisma.aIMessage.create({
      data: {
        sessionId: session.id,
        role: 'ASSISTANT',
        content: reply.answer
      }
    });

    await prisma.aISession.update({
      where: {
        id: session.id
      },
      data: {
        subagent: reply.subagent
      }
    });

    if (reply.actionType) {
      await prisma.aIAction.create({
        data: {
          sessionId: session.id,
          actionType: reply.actionType,
          payload: (reply.actionPayload ?? Prisma.JsonNull) as Prisma.InputJsonValue | Prisma.NullTypes.JsonNull
        }
      });
    }

    const recentMessages = await prisma.aIMessage.findMany({
      where: {
        sessionId: session.id
      },
      orderBy: {
        createdAt: 'asc'
      },
      take: 40
    });

    res.status(201).json({
      session: {
        id: session.id,
        title: session.title,
        subagent: reply.subagent.toLowerCase(),
        createdAt: session.createdAt.toISOString(),
        updatedAt: new Date().toISOString()
      },
      answer: serializeAiMessage(assistantMessage),
      messages: recentMessages.map(serializeAiMessage)
    });
  })
);

aiRouter.get(
  '/sessions',
  asyncHandler(async (req, res) => {
    const authUser = req.authUser;
    if (!authUser) {
      throw createError(401, 'Unauthorized');
    }

    const sessions = await prisma.aISession.findMany({
      where: {
        userId: authUser.id
      },
      orderBy: {
        updatedAt: 'desc'
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      }
    });

    res.json({
      sessions: sessions.map((session) => ({
        id: session.id,
        title: session.title,
        subagent: session.subagent.toLowerCase(),
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
        lastMessage: session.messages[0]?.content
      }))
    });
  })
);

aiRouter.get(
  '/sessions/:sessionId/messages',
  asyncHandler(async (req, res) => {
    const authUser = req.authUser;
    if (!authUser) {
      throw createError(401, 'Unauthorized');
    }

    const sessionId = typeof req.params.sessionId === 'string' ? req.params.sessionId : '';
    if (!sessionId) {
      throw createError(400, 'Invalid session id');
    }

    const session = await prisma.aISession.findUnique({
      where: {
        id: sessionId
      }
    });

    if (!session || session.userId !== authUser.id) {
      throw createError(403, 'No access to this session');
    }

    const messages = await prisma.aIMessage.findMany({
      where: {
        sessionId
      },
      orderBy: {
        createdAt: 'asc'
      },
      take: 200
    });

    res.json({
      session: {
        id: session.id,
        title: session.title,
        subagent: session.subagent.toLowerCase(),
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString()
      },
      messages: messages.map(serializeAiMessage)
    });
  })
);
