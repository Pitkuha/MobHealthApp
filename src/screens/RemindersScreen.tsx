import React, { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SectionCard } from '../components/SectionCard';
import { useAppData } from '../context/AppContext';
import { theme } from '../theme';

export function RemindersScreen() {
  const { currentUser, lessons, reminders, createReminder, refreshReminders } = useAppData();
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    void refreshReminders();
  }, []);

  if (!currentUser) {
    return null;
  }

  if (currentUser.role !== 'patient') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.note}>Напоминания доступны пациенту.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const onCreate = async (
    lessonId: string,
    lessonTitle: string,
    lessonDate: string,
    minutesBefore: number
  ) => {
    const result = await createReminder(lessonId, lessonTitle, lessonDate, minutesBefore);
    setStatus(result.ok ? 'Напоминание создано' : result.error ?? 'Не удалось создать напоминание');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <SectionCard title="Напоминания по урокам" subtitle="Push + локальные уведомления на устройстве">
          {lessons.map((lesson) => (
            <View key={lesson.id} style={styles.lessonCard}>
              <Text style={styles.lessonTitle}>{lesson.title}</Text>
              <Text style={styles.lessonDate}>{lesson.date}</Text>
              <View style={styles.buttonRow}>
                <Pressable
                  style={styles.reminderButton}
                  onPress={() => onCreate(lesson.id, lesson.title, lesson.date, 30)}
                >
                  <Text style={styles.buttonText}>За 30 мин</Text>
                </Pressable>
                <Pressable
                  style={styles.reminderButton}
                  onPress={() => onCreate(lesson.id, lesson.title, lesson.date, 60)}
                >
                  <Text style={styles.buttonText}>За 60 мин</Text>
                </Pressable>
              </View>
            </View>
          ))}
          {status ? <Text style={styles.note}>{status}</Text> : null}
        </SectionCard>

        <SectionCard title="Мои созданные напоминания">
          {reminders.length === 0 ? (
            <Text style={styles.note}>Пока нет напоминаний.</Text>
          ) : (
            reminders.map((item) => (
              <View key={item.id} style={styles.reminderRow}>
                <Text style={styles.lessonTitle}>{item.lessonTitle}</Text>
                <Text style={styles.note}>{new Date(item.remindAt).toLocaleString()}</Text>
                <Text style={styles.status}>{item.status}</Text>
              </View>
            ))
          )}
        </SectionCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.bg
  },
  container: {
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    paddingBottom: 30
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  note: {
    color: theme.colors.textMuted
  },
  lessonCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    padding: 10,
    gap: 6
  },
  lessonTitle: {
    fontWeight: '700',
    color: theme.colors.text
  },
  lessonDate: {
    color: theme.colors.secondary,
    fontWeight: '600'
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8
  },
  reminderButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 9
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  reminderRow: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    padding: 10,
    gap: 3
  },
  status: {
    color: theme.colors.primary,
    fontWeight: '700'
  }
});
