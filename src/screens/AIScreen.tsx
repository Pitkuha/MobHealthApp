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

export function AIScreen() {
  const {
    currentUser,
    aiSessions,
    aiMessages,
    aiActiveSessionId,
    refreshAiSessions,
    openAiSession,
    askAi
  } = useAppData();

  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    void refreshAiSessions();
  }, []);

  if (!currentUser) {
    return null;
  }

  const onAsk = async () => {
    const result = await askAi(draft);
    if (!result.ok) {
      setStatus(result.error ?? 'Ошибка запроса');
      return;
    }

    setStatus(null);
    setDraft('');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <SectionCard
          title="AI Assistant"
          subtitle="Subagent выбирается автоматически по вашей роли"
        >
          <Text style={styles.note}>Роль: {currentUser.role}</Text>
          <Text style={styles.note}>Активная сессия: {aiActiveSessionId ?? 'новая'}</Text>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Спросите AI о ваших задачах"
            style={styles.input}
            multiline
          />
          <Pressable style={styles.askButton} onPress={onAsk}>
            <Text style={styles.askText}>Отправить в AI</Text>
          </Pressable>
          {status ? <Text style={styles.error}>{status}</Text> : null}
        </SectionCard>

        <SectionCard title="История сессий" subtitle="Для аудита и быстрого возврата к диалогу">
          {aiSessions.length === 0 ? (
            <Text style={styles.note}>Сессий пока нет.</Text>
          ) : (
            aiSessions.map((session) => {
              const active = session.id === aiActiveSessionId;
              return (
                <Pressable
                  key={session.id}
                  style={[styles.sessionCard, active && styles.sessionCardActive]}
                  onPress={() => void openAiSession(session.id)}
                >
                  <Text style={styles.sessionTitle}>{session.title ?? 'AI Session'}</Text>
                  <Text style={styles.note}>Subagent: {session.subagent}</Text>
                  <Text style={styles.note}>{session.lastMessage ?? 'Нет сообщений'}</Text>
                </Pressable>
              );
            })
          )}
        </SectionCard>

        <SectionCard title="Диалог">
          {aiMessages.length === 0 ? (
            <Text style={styles.note}>Сообщений пока нет.</Text>
          ) : (
            aiMessages.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.message,
                  item.role === 'assistant' ? styles.assistantMessage : styles.userMessage
                ]}
              >
                <Text style={styles.messageRole}>{item.role.toUpperCase()}</Text>
                <Text style={styles.messageText}>{item.content}</Text>
                <Text style={styles.timeText}>{new Date(item.createdAt).toLocaleString()}</Text>
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
  note: {
    color: theme.colors.textMuted
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    padding: 10,
    minHeight: 72,
    textAlignVertical: 'top'
  },
  askButton: {
    backgroundColor: theme.colors.secondary,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 11
  },
  askText: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  error: {
    color: theme.colors.danger,
    fontWeight: '600'
  },
  sessionCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#FFFFFF',
    gap: 4
  },
  sessionCardActive: {
    borderColor: theme.colors.primary,
    backgroundColor: '#EEF9F6'
  },
  sessionTitle: {
    fontWeight: '700',
    color: theme.colors.text
  },
  message: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    padding: 10,
    gap: 4
  },
  assistantMessage: {
    backgroundColor: '#E8F2FF'
  },
  userMessage: {
    backgroundColor: '#ECFAF2'
  },
  messageRole: {
    fontWeight: '700',
    color: theme.colors.secondary,
    fontSize: 12
  },
  messageText: {
    color: theme.colors.text,
    lineHeight: 19
  },
  timeText: {
    color: theme.colors.textMuted,
    fontSize: 11
  }
});
