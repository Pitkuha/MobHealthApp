import React, { useMemo } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SectionCard } from '../components/SectionCard';
import { useAppData } from '../context/AppContext';
import { theme } from '../theme';

export function DoctorToolsScreen() {
  const { currentUser, createReferralCode, referralCodes, getPatientsForDoctor } = useAppData();
  const [status, setStatus] = React.useState<string | null>(null);

  if (!currentUser) {
    return null;
  }

  if (currentUser.role !== 'doctor') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.note}>Этот экран доступен только врачу.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const myCodes = useMemo(
    () => referralCodes.filter((code) => code.doctorId === currentUser.id),
    [referralCodes, currentUser.id]
  );

  const patients = getPatientsForDoctor(currentUser.id);

  const onGenerate = async () => {
    const created = await createReferralCode(currentUser.id);
    setStatus(created ? `Код ${created.code} создан` : 'Не удалось создать код');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <SectionCard
          title="Реферальные коды"
          subtitle="Пациент вводит код при регистрации и автоматически привязывается к вам"
        >
          <Pressable style={styles.generateButton} onPress={onGenerate}>
            <Text style={styles.generateText}>Создать новый код</Text>
          </Pressable>
          {status ? <Text style={styles.note}>{status}</Text> : null}
          {myCodes.map((item) => (
            <View key={item.id} style={styles.codeCard}>
              <Text style={styles.codeText}>{item.code}</Text>
              <Text style={styles.codeMeta}>{item.active ? 'Активен' : 'Использован'}</Text>
            </View>
          ))}
        </SectionCard>

        <SectionCard title="Привязанные пациенты">
          {patients.length === 0 ? (
            <Text style={styles.note}>Пока нет привязанных пациентов.</Text>
          ) : (
            patients.map((patient) => (
              <View key={patient.id} style={styles.patientCard}>
                <Text style={styles.patientName}>{patient.fullName}</Text>
                <Text style={styles.note}>{patient.about}</Text>
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
  generateButton: {
    backgroundColor: theme.colors.secondary,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12
  },
  generateText: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  codeCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#F8FCFF'
  },
  codeText: {
    color: theme.colors.primary,
    fontWeight: '800',
    fontSize: 16
  },
  codeMeta: {
    color: theme.colors.textMuted,
    marginTop: 3
  },
  patientCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#FFFFFF',
    marginBottom: 8
  },
  patientName: {
    color: theme.colors.text,
    fontWeight: '700'
  }
});
