import React, { useEffect, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { SectionCard } from '../components/SectionCard';
import { useAppData } from '../context/AppContext';
import { theme } from '../theme';

type UserDraft = {
  fullName: string;
  email: string;
  about: string;
  ageOrSpecialty: string;
};

type LessonDraft = {
  title: string;
  description: string;
  date: string;
  durationMin: string;
};

export function AdminScreen() {
  const { currentUser, users, lessons, referralCodes, updateUser, updateLesson, updateReferralCode } =
    useAppData();

  const [userDrafts, setUserDrafts] = useState<Record<string, UserDraft>>({});
  const [lessonDrafts, setLessonDrafts] = useState<Record<string, LessonDraft>>({});

  const updateUserDraftField = (
    userId: string,
    field: keyof UserDraft,
    value: string
  ) => {
    setUserDrafts((prev) => {
      const current = prev[userId];
      if (!current) {
        return prev;
      }
      return {
        ...prev,
        [userId]: {
          ...current,
          [field]: value
        }
      };
    });
  };

  const updateLessonDraftField = (
    lessonId: string,
    field: keyof LessonDraft,
    value: string
  ) => {
    setLessonDrafts((prev) => {
      const current = prev[lessonId];
      if (!current) {
        return prev;
      }
      return {
        ...prev,
        [lessonId]: {
          ...current,
          [field]: value
        }
      };
    });
  };

  useEffect(() => {
    const draftMap = users.reduce<Record<string, UserDraft>>((acc, user) => {
      acc[user.id] = {
        fullName: user.fullName,
        email: user.email,
        about: user.about ?? '',
        ageOrSpecialty: user.role === 'patient' ? String(user.age ?? '') : user.specialty ?? ''
      };
      return acc;
    }, {});

    setUserDrafts(draftMap);
  }, [users]);

  useEffect(() => {
    const draftMap = lessons.reduce<Record<string, LessonDraft>>((acc, lesson) => {
      acc[lesson.id] = {
        title: lesson.title,
        description: lesson.description,
        date: lesson.date,
        durationMin: String(lesson.durationMin)
      };
      return acc;
    }, {});

    setLessonDrafts(draftMap);
  }, [lessons]);

  if (!currentUser) {
    return null;
  }

  if (currentUser.role !== 'admin') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.note}>Экран редактирования доступен только администратору.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <SectionCard title="Редактирование пользователей" subtitle="Пациенты, врачи и админ">
          {users.map((user) => {
            const draft = userDrafts[user.id];
            if (!draft) {
              return null;
            }

            return (
              <View key={user.id} style={styles.itemCard}>
                <Text style={styles.itemTitle}>{user.role.toUpperCase()}</Text>
                <TextInput
                  value={draft.fullName}
                  onChangeText={(value) => updateUserDraftField(user.id, 'fullName', value)}
                  placeholder="ФИО"
                  style={styles.input}
                />
                <TextInput
                  value={draft.email}
                  onChangeText={(value) => updateUserDraftField(user.id, 'email', value)}
                  placeholder="E-mail"
                  style={styles.input}
                />
                <TextInput
                  value={draft.ageOrSpecialty}
                  onChangeText={(value) => updateUserDraftField(user.id, 'ageOrSpecialty', value)}
                  placeholder={user.role === 'patient' ? 'Возраст' : 'Специализация'}
                  style={styles.input}
                />
                <TextInput
                  value={draft.about}
                  onChangeText={(value) => updateUserDraftField(user.id, 'about', value)}
                  placeholder="О себе"
                  style={[styles.input, styles.multiline]}
                  multiline
                />
                <Pressable
                  style={styles.saveButton}
                  onPress={() =>
                    updateUser(user.id, {
                      fullName: draft.fullName,
                      email: draft.email,
                      about: draft.about,
                      ...(user.role === 'patient'
                        ? { age: Number(draft.ageOrSpecialty) || undefined }
                        : { specialty: draft.ageOrSpecialty || undefined })
                    })
                  }
                >
                  <Text style={styles.saveText}>Сохранить пользователя</Text>
                </Pressable>
              </View>
            );
          })}
        </SectionCard>

        <SectionCard title="Редактирование уроков" subtitle="Название, описание, дата, длительность">
          {lessons.map((lesson) => {
            const draft = lessonDrafts[lesson.id];
            if (!draft) {
              return null;
            }

            return (
              <View key={lesson.id} style={styles.itemCard}>
                <Text style={styles.itemTitle}>{lesson.id}</Text>
                <TextInput
                  value={draft.title}
                  onChangeText={(value) => updateLessonDraftField(lesson.id, 'title', value)}
                  placeholder="Название"
                  style={styles.input}
                />
                <TextInput
                  value={draft.description}
                  onChangeText={(value) => updateLessonDraftField(lesson.id, 'description', value)}
                  placeholder="Описание"
                  style={[styles.input, styles.multiline]}
                  multiline
                />
                <TextInput
                  value={draft.date}
                  onChangeText={(value) => updateLessonDraftField(lesson.id, 'date', value)}
                  placeholder="Дата YYYY-MM-DD"
                  style={styles.input}
                />
                <TextInput
                  value={draft.durationMin}
                  onChangeText={(value) => updateLessonDraftField(lesson.id, 'durationMin', value)}
                  placeholder="Длительность в минутах"
                  style={styles.input}
                  keyboardType="number-pad"
                />
                <Pressable
                  style={styles.saveButton}
                  onPress={() =>
                    updateLesson(lesson.id, {
                      title: draft.title,
                      description: draft.description,
                      date: draft.date,
                      durationMin: Number(draft.durationMin) || lesson.durationMin
                    })
                  }
                >
                  <Text style={styles.saveText}>Сохранить урок</Text>
                </Pressable>
              </View>
            );
          })}
        </SectionCard>

        <SectionCard title="Реферальные коды" subtitle="Админ может активировать и деактивировать коды">
          {referralCodes.map((code) => (
            <View key={code.id} style={styles.codeRow}>
              <View>
                <Text style={styles.codeMain}>{code.code}</Text>
                <Text style={styles.note}>{code.active ? 'Активен' : 'Отключен / использован'}</Text>
              </View>
              <Pressable
                style={[styles.toggleButton, code.active ? styles.disableButton : styles.enableButton]}
                onPress={() => updateReferralCode(code.id, { active: !code.active })}
              >
                <Text style={styles.toggleText}>{code.active ? 'Отключить' : 'Активировать'}</Text>
              </Pressable>
            </View>
          ))}
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
    justifyContent: 'center',
    padding: 20
  },
  note: {
    color: theme.colors.textMuted
  },
  itemCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#FFFFFF',
    gap: 8
  },
  itemTitle: {
    fontWeight: '700',
    color: theme.colors.secondary
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  multiline: {
    minHeight: 70,
    textAlignVertical: 'top'
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center'
  },
  saveText: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  codeRow: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  codeMain: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.primary
  },
  toggleButton: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12
  },
  disableButton: {
    backgroundColor: '#FFF1F1'
  },
  enableButton: {
    backgroundColor: '#E8FFF3'
  },
  toggleText: {
    fontWeight: '700',
    color: theme.colors.text
  }
});
