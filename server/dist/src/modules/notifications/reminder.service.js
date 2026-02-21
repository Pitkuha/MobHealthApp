import { ReminderStatus } from '@prisma/client';
import { Expo } from 'expo-server-sdk';
import { env } from '../../config/env';
import { prisma } from '../../db/prisma';
const expo = new Expo({ accessToken: env.expoAccessToken });
export async function dispatchDueReminders(now = new Date()) {
    const reminders = await prisma.lessonReminder.findMany({
        where: {
            status: ReminderStatus.PENDING,
            remindAt: {
                lte: now
            }
        },
        include: {
            lesson: true,
            user: {
                include: {
                    pushTokens: true
                }
            }
        },
        take: 100
    });
    if (reminders.length === 0) {
        return { sent: 0, attempted: 0 };
    }
    const messages = [];
    const reminderIdsToMark = [];
    reminders.forEach((reminder) => {
        const validTokens = reminder.user.pushTokens
            .map((tokenItem) => tokenItem.token)
            .filter((token) => Expo.isExpoPushToken(token));
        if (validTokens.length === 0) {
            reminderIdsToMark.push(reminder.id);
            return;
        }
        validTokens.forEach((token) => {
            messages.push({
                to: token,
                sound: 'default',
                title: 'Напоминание об уроке',
                body: `Скоро урок: ${reminder.lesson.title}`,
                data: {
                    lessonId: reminder.lessonId,
                    reminderId: reminder.id
                }
            });
        });
        reminderIdsToMark.push(reminder.id);
    });
    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
        await expo.sendPushNotificationsAsync(chunk);
    }
    await prisma.lessonReminder.updateMany({
        where: {
            id: {
                in: reminderIdsToMark
            }
        },
        data: {
            status: ReminderStatus.SENT,
            sentAt: now
        }
    });
    return {
        sent: reminderIdsToMark.length,
        attempted: messages.length
    };
}
