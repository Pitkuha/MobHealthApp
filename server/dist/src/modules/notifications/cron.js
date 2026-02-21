import cron from 'node-cron';
import { dispatchDueReminders } from './reminder.service';
export function startReminderCron() {
    // Every minute checks pending reminders and sends due push notifications.
    const task = cron.schedule('* * * * *', async () => {
        try {
            await dispatchDueReminders();
        }
        catch (error) {
            console.error('Reminder dispatch error', error);
        }
    });
    return task;
}
