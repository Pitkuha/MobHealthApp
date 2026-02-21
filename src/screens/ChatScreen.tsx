import React, { useMemo, useState } from 'react';
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
import { User } from '../types';
import { theme } from '../theme';

function Selector({
  users,
  value,
  onChange,
  title
}: {
  users: User[];
  value: string | null;
  onChange: (id: string) => void;
  title: string;
}) {
  return (
    <View style={styles.selectorWrap}>
      <Text style={styles.selectorTitle}>{title}</Text>
      <View style={styles.selectorRow}>
        {users.map((user) => {
          const active = value === user.id;
          return (
            <Pressable
              key={user.id}
              onPress={() => onChange(user.id)}
              style={[styles.selectorChip, active && styles.selectorChipActive]}
            >
              <Text style={[styles.selectorText, active && styles.selectorTextActive]}>{user.fullName}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function ChatScreen() {
  const {
    currentUser,
    usersByRole,
    getDoctorForPatient,
    getPatientsForDoctor,
    getMessagesForPair,
    sendMessage,
    links,
    users
  } = useAppData();

  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);

  const doctors = usersByRole('doctor');
  const patients = usersByRole('patient');

  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(doctors[0]?.id ?? null);
  const [selectedAdminPatientId, setSelectedAdminPatientId] = useState<string | null>(patients[0]?.id ?? null);

  if (!currentUser) {
    return null;
  }

  let counterpart: User | undefined;
  let chatMessages = [] as ReturnType<typeof getMessagesForPair>;
  let canSend = true;

  if (currentUser.role === 'patient') {
    counterpart = getDoctorForPatient(currentUser.id);
    if (counterpart) {
      chatMessages = getMessagesForPair(currentUser.id, counterpart.id);
    }
  }

  if (currentUser.role === 'doctor') {
    const doctorPatients = getPatientsForDoctor(currentUser.id);
    const currentPairPatientId = selectedPatientId ?? doctorPatients[0]?.id ?? null;
    counterpart = doctorPatients.find((patient) => patient.id === currentPairPatientId);
    if (counterpart) {
      chatMessages = getMessagesForPair(currentUser.id, counterpart.id);
    }
  }

  if (currentUser.role === 'admin') {
    canSend = false;
    const linkedPatients = links
      .filter((link) => link.doctorId === selectedDoctorId)
      .map((link) => users.find((user) => user.id === link.patientId))
      .filter((user): user is User => Boolean(user));

    const patientId = selectedAdminPatientId ?? linkedPatients[0]?.id ?? null;
    const doctor = users.find((user) => user.id === selectedDoctorId);
    const patient = linkedPatients.find((user) => user.id === patientId);

    if (doctor && patient) {
      chatMessages = getMessagesForPair(doctor.id, patient.id);
    }
  }

  const onSend = async () => {
    if (!counterpart || !currentUser || !canSend) {
      return;
    }
    const result = await sendMessage(currentUser.id, counterpart.id, draft);
    if (!result.ok) {
      setSendError(result.error ?? 'Не удалось отправить сообщение');
      return;
    }
    setSendError(null);
    setDraft('');
  };

  const doctorPatientsForAdmin = useMemo(() => {
    const items = links
      .filter((link) => link.doctorId === selectedDoctorId)
      .map((link) => users.find((user) => user.id === link.patientId))
      .filter((user): user is User => Boolean(user));

    return items;
  }, [links, selectedDoctorId, users]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {currentUser.role === 'doctor' && (
          <SectionCard title="Выбор пациента" subtitle="Переписка с привязанными пациентами">
            <Selector
              users={getPatientsForDoctor(currentUser.id)}
              value={selectedPatientId}
              onChange={setSelectedPatientId}
              title="Пациенты"
            />
          </SectionCard>
        )}

        {currentUser.role === 'admin' && (
          <SectionCard title="Мониторинг чатов" subtitle="Только просмотр переписки">
            <Selector
              users={doctors}
              value={selectedDoctorId}
              onChange={setSelectedDoctorId}
              title="Врач"
            />
            <Selector
              users={doctorPatientsForAdmin}
              value={selectedAdminPatientId}
              onChange={setSelectedAdminPatientId}
              title="Пациент"
            />
          </SectionCard>
        )}

        <SectionCard
          title="Чат"
          subtitle={
            currentUser.role === 'admin'
              ? 'Просмотр сообщений между врачом и пациентом'
              : `Диалог: ${counterpart?.fullName ?? 'контакт не выбран'}`
          }
        >
          {chatMessages.length === 0 ? (
            <Text style={styles.emptyText}>Сообщений пока нет.</Text>
          ) : (
            chatMessages.map((msg) => {
              const isMine = msg.fromId === currentUser.id;
              return (
                <View key={msg.id} style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubblePeer]}>
                  <Text style={styles.bubbleText}>{msg.text}</Text>
                  <Text style={styles.timeText}>{new Date(msg.createdAt).toLocaleString()}</Text>
                </View>
              );
            })
          )}

          {canSend && counterpart ? (
            <View style={styles.inputRow}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                style={styles.input}
                placeholder="Введите сообщение"
                multiline
              />
              <Pressable style={styles.sendButton} onPress={onSend}>
                <Text style={styles.sendText}>Отправить</Text>
              </Pressable>
              {sendError ? <Text style={styles.emptyText}>{sendError}</Text> : null}
            </View>
          ) : (
            <Text style={styles.emptyText}>Отправка доступна только врачу и пациенту.</Text>
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
    paddingBottom: 30,
    gap: theme.spacing.sm
  },
  selectorWrap: {
    gap: 6
  },
  selectorTitle: {
    fontWeight: '700',
    color: theme.colors.text
  },
  selectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  selectorChip: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#FFFFFF'
  },
  selectorChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft
  },
  selectorText: {
    color: theme.colors.textMuted,
    fontSize: 13
  },
  selectorTextActive: {
    color: theme.colors.primary,
    fontWeight: '700'
  },
  emptyText: {
    color: theme.colors.textMuted
  },
  bubble: {
    padding: 10,
    borderRadius: 12,
    gap: 6,
    maxWidth: '90%'
  },
  bubbleMine: {
    backgroundColor: '#CDECE7',
    alignSelf: 'flex-end'
  },
  bubblePeer: {
    backgroundColor: '#E7EEF9',
    alignSelf: 'flex-start'
  },
  bubbleText: {
    color: theme.colors.text,
    lineHeight: 18
  },
  timeText: {
    color: theme.colors.textMuted,
    fontSize: 11
  },
  inputRow: {
    marginTop: 8,
    gap: 8
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    padding: 10,
    minHeight: 60,
    textAlignVertical: 'top'
  },
  sendButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center'
  },
  sendText: {
    color: '#FFFFFF',
    fontWeight: '700'
  }
});
