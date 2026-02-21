import React, { useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { useAppData } from '../context/AppContext';
import { theme } from '../theme';

const demoAccounts = [
  { label: 'Пациент', email: 'anna@example.com', password: 'patient123' },
  { label: 'Врач', email: 'e.orlova@clinic.com', password: 'doctor123' },
  { label: 'Админ', email: 'admin@mobhealth.app', password: 'admin123' }
];

export function AuthScreen() {
  const { login, registerPatientByReferral } = useAppData();

  const [email, setEmail] = useState('anna@example.com');
  const [password, setPassword] = useState('patient123');
  const [loginError, setLoginError] = useState<string | null>(null);

  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientEmail, setNewPatientEmail] = useState('');
  const [newPatientPassword, setNewPatientPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [registerError, setRegisterError] = useState<string | null>(null);

  const onLogin = async () => {
    const result = await login(email, password);
    if (!result.ok) {
      setLoginError(result.error ?? 'Ошибка авторизации');
      return;
    }

    setLoginError(null);
  };

  const onRegister = async () => {
    const result = await registerPatientByReferral(
      newPatientName,
      newPatientEmail,
      newPatientPassword,
      referralCode
    );

    if (!result.ok) {
      setRegisterError(result.error ?? 'Не удалось зарегистрироваться');
      return;
    }

    setRegisterError(null);
    setNewPatientName('');
    setNewPatientEmail('');
    setNewPatientPassword('');
    setReferralCode('');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>MobHealth</Text>
        <Text style={styles.subtitle}>PostgreSQL backend, роли, уроки, календарь, чат и напоминания</Text>

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Вход</Text>
          <TextInput
            placeholder="E-mail"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
          />
          <TextInput
            placeholder="Пароль"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={styles.input}
          />
          <Pressable style={styles.primaryButton} onPress={onLogin}>
            <Text style={styles.primaryText}>Войти</Text>
          </Pressable>
          {loginError ? <Text style={styles.errorText}>{loginError}</Text> : null}

          <Text style={styles.hint}>Демо-аккаунты:</Text>
          <View style={styles.demoRow}>
            {demoAccounts.map((item) => (
              <Pressable
                key={item.email}
                onPress={() => {
                  setEmail(item.email);
                  setPassword(item.password);
                }}
                style={styles.demoChip}
              >
                <Text style={styles.demoText}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Регистрация пациента по реферальному коду</Text>
          <TextInput
            placeholder="ФИО"
            value={newPatientName}
            onChangeText={setNewPatientName}
            style={styles.input}
          />
          <TextInput
            placeholder="E-mail"
            value={newPatientEmail}
            onChangeText={setNewPatientEmail}
            style={styles.input}
            autoCapitalize="none"
          />
          <TextInput
            placeholder="Пароль"
            secureTextEntry
            value={newPatientPassword}
            onChangeText={setNewPatientPassword}
            style={styles.input}
          />
          <TextInput
            placeholder="Код от врача"
            autoCapitalize="characters"
            value={referralCode}
            onChangeText={setReferralCode}
            style={styles.input}
          />
          <Pressable style={styles.primaryButton} onPress={onRegister}>
            <Text style={styles.primaryText}>Создать аккаунт пациента</Text>
          </Pressable>
          {registerError ? <Text style={styles.errorText}>{registerError}</Text> : null}
        </View>
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
    padding: theme.spacing.lg,
    gap: theme.spacing.md
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.colors.secondary
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    lineHeight: 20
  },
  block: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    borderColor: theme.colors.border,
    borderWidth: 1,
    padding: theme.spacing.md,
    gap: theme.spacing.sm
  },
  blockTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  primaryButton: {
    marginTop: 2,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center'
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  errorText: {
    color: theme.colors.danger,
    fontWeight: '600'
  },
  hint: {
    marginTop: 6,
    color: theme.colors.textMuted,
    fontSize: 13
  },
  demoRow: {
    flexDirection: 'row',
    gap: 6
  },
  demoChip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FAFDFF'
  },
  demoText: {
    color: theme.colors.secondary,
    fontWeight: '700',
    fontSize: 12
  }
});
