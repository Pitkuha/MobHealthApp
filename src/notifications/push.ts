import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
});

export async function registerForPushToken(): Promise<string | null> {
  const permission = await Notifications.getPermissionsAsync();
  let status = permission.status;

  if (status !== 'granted') {
    const ask = await Notifications.requestPermissionsAsync();
    status = ask.status;
  }

  if (status !== 'granted') {
    return null;
  }

  try {
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    return tokenData.data;
  } catch {
    return null;
  }
}

export async function scheduleLocalLessonReminder(
  lessonTitle: string,
  lessonDate: string,
  minutesBefore: number
): Promise<string | null> {
  const lesson = new Date(`${lessonDate}T09:00:00`);
  const triggerAt = new Date(lesson.getTime() - minutesBefore * 60 * 1000);

  if (triggerAt.getTime() <= Date.now()) {
    return null;
  }

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Напоминание об уроке',
      body: `Скоро урок: ${lessonTitle}`,
      sound: 'default'
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerAt
    }
  });
}
