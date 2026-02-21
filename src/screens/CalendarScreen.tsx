import React, { useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { LessonCard } from '../components/LessonCard';
import { SectionCard } from '../components/SectionCard';
import { useAppData } from '../context/AppContext';
import { theme } from '../theme';

export function CalendarScreen() {
  const { lessons } = useAppData();

  const lessonsByDate = useMemo(() => {
    return lessons.reduce<Record<string, typeof lessons>>((acc, lesson) => {
      const current = acc[lesson.date] ?? [];
      acc[lesson.date] = [...current, lesson];
      return acc;
    }, {});
  }, [lessons]);

  const firstDate = Object.keys(lessonsByDate).sort()[0];
  const [selectedDate, setSelectedDate] = useState<string>(firstDate ?? new Date().toISOString().slice(0, 10));

  const markedDates = useMemo(() => {
    const marks: Record<string, { marked?: boolean; selected?: boolean; selectedColor?: string }> = {};
    Object.keys(lessonsByDate).forEach((date) => {
      marks[date] = { marked: true };
    });

    marks[selectedDate] = {
      ...(marks[selectedDate] ?? {}),
      selected: true,
      selectedColor: theme.colors.primary
    };

    return marks;
  }, [lessonsByDate, selectedDate]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <SectionCard title="Календарь уроков" subtitle="Выберите дату и откройте назначенные тренировки">
          <Calendar
            onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
            markedDates={markedDates}
            theme={{
              todayTextColor: theme.colors.secondary,
              arrowColor: theme.colors.primary,
              dotColor: theme.colors.secondary,
              textDayFontWeight: '500',
              textMonthFontWeight: '700'
            }}
          />
        </SectionCard>

        <SectionCard title={`Уроки на ${selectedDate}`}>
          {(lessonsByDate[selectedDate] ?? []).length === 0 ? (
            <Text style={styles.emptyText}>На эту дату уроков пока нет.</Text>
          ) : (
            (lessonsByDate[selectedDate] ?? []).map((lesson) => (
              <LessonCard key={lesson.id} lesson={lesson} />
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
    paddingBottom: 30
  },
  emptyText: {
    color: theme.colors.textMuted
  }
});
