import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LessonCard } from '../components/LessonCard';
import { RoleBadge } from '../components/RoleBadge';
import { SectionCard } from '../components/SectionCard';
import { useAppData } from '../context/AppContext';
import { theme } from '../theme';

export function HomeScreen() {
  const { currentUser, weeks, users, getDoctorForPatient, getPatientsForDoctor } = useAppData();

  if (!currentUser) {
    return null;
  }

  const doctor = currentUser.role === 'patient' ? getDoctorForPatient(currentUser.id) : undefined;
  const doctorPatients = currentUser.role === 'doctor' ? getPatientsForDoctor(currentUser.id) : [];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <RoleBadge role={currentUser.role} />
          <Text style={styles.greeting}>{currentUser.fullName}</Text>
          <Text style={styles.heroText}>
            {currentUser.role === 'patient'
              ? 'Ваши аутогенные тренировки собраны по неделям. Включайте уроки и отслеживайте прогресс.'
              : currentUser.role === 'doctor'
                ? 'Контролируйте пациентов, назначайте уроки и поддерживайте связь через чат.'
                : 'Вы управляете пользователями, контентом и настройками приложения.'}
          </Text>
        </View>

        {currentUser.role === 'patient' && (
          <SectionCard
            title="Ваш врач"
            subtitle="Связь устанавливается через реферальный код"
          >
            <Text style={styles.strongText}>{doctor?.fullName ?? 'Врач не назначен'}</Text>
            <Text style={styles.mutedText}>{doctor?.specialty ?? 'Ожидает привязки'}</Text>
          </SectionCard>
        )}

        {currentUser.role === 'doctor' && (
          <SectionCard title="Мои пациенты" subtitle="Пациенты, привязанные по вашим кодам">
            {doctorPatients.length === 0 ? (
              <Text style={styles.mutedText}>Пока нет привязанных пациентов.</Text>
            ) : (
              doctorPatients.map((patient) => (
                <View key={patient.id} style={styles.patientRow}>
                  <Text style={styles.strongText}>{patient.fullName}</Text>
                  <Text style={styles.mutedText}>{patient.about}</Text>
                </View>
              ))
            )}
          </SectionCard>
        )}

        {currentUser.role === 'admin' && (
          <SectionCard title="Сводка" subtitle="Текущее состояние системы">
            <Text style={styles.strongText}>Пользователи: {users.length}</Text>
            <Text style={styles.mutedText}>Программы недель: {weeks.length}</Text>
            <Text style={styles.mutedText}>Уроков: {weeks.flatMap((week) => week.lessons).length}</Text>
          </SectionCard>
        )}

        {weeks.map((week) => (
          <SectionCard key={week.id} title={week.title} subtitle="Аутогенные тренировки">
            {week.lessons.map((lesson) => (
              <LessonCard key={lesson.id} lesson={lesson} />
            ))}
          </SectionCard>
        ))}
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
  hero: {
    backgroundColor: theme.colors.secondary,
    borderRadius: 20,
    padding: 16,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.xs
  },
  greeting: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800'
  },
  heroText: {
    color: '#E6F0FF',
    lineHeight: 20
  },
  strongText: {
    color: theme.colors.text,
    fontWeight: '700'
  },
  mutedText: {
    color: theme.colors.textMuted,
    lineHeight: 19
  },
  patientRow: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: 10,
    backgroundColor: '#FAFDFF',
    gap: 4
  }
});
