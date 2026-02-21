import React, { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { SectionCard } from '../components/SectionCard';
import { useAppData } from '../context/AppContext';
import { theme } from '../theme';

export function ProfileScreen() {
  const { currentUser, updateUser, logout } = useAppData();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [about, setAbout] = useState('');
  const [ageOrSpecialty, setAgeOrSpecialty] = useState('');

  useEffect(() => {
    if (!currentUser) {
      return;
    }
    setFullName(currentUser.fullName);
    setEmail(currentUser.email);
    setAbout(currentUser.about ?? '');
    setAgeOrSpecialty(
      currentUser.role === 'patient' ? String(currentUser.age ?? '') : currentUser.specialty ?? ''
    );
  }, [currentUser]);

  if (!currentUser) {
    return null;
  }

  const onSave = async () => {
    await updateUser(currentUser.id, {
      fullName,
      email,
      about,
      ...(currentUser.role === 'patient'
        ? { age: Number(ageOrSpecialty) || undefined }
        : { specialty: ageOrSpecialty || undefined })
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <SectionCard title="Личный кабинет" subtitle="Редактируйте персональные данные">
          <TextInput value={fullName} onChangeText={setFullName} style={styles.input} placeholder="ФИО" />
          <TextInput value={email} onChangeText={setEmail} style={styles.input} placeholder="E-mail" />
          <TextInput
            value={ageOrSpecialty}
            onChangeText={setAgeOrSpecialty}
            style={styles.input}
            placeholder={currentUser.role === 'patient' ? 'Возраст' : 'Специализация'}
            keyboardType={currentUser.role === 'patient' ? 'number-pad' : 'default'}
          />
          <TextInput
            value={about}
            onChangeText={setAbout}
            style={[styles.input, styles.multiline]}
            placeholder="О себе"
            multiline
          />
        <Pressable style={styles.primaryButton} onPress={() => void onSave()}>
          <Text style={styles.primaryText}>Сохранить</Text>
        </Pressable>
      </SectionCard>

        <Pressable style={styles.logoutButton} onPress={() => void logout()}>
          <Text style={styles.logoutText}>Выйти из аккаунта</Text>
        </Pressable>
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
    gap: theme.spacing.sm
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  multiline: {
    minHeight: 84,
    textAlignVertical: 'top'
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 11
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  logoutButton: {
    backgroundColor: '#FFF1F1',
    borderColor: '#F7CACA',
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12
  },
  logoutText: {
    color: theme.colors.danger,
    fontWeight: '700'
  }
});
