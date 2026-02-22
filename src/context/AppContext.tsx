import React, { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { clearToken, getToken, saveToken } from '../api/storage';
import { scheduleLocalLessonReminder, registerForPushToken } from '../notifications/push';
import {
  AiMessage,
  AiSession,
  ChatMessage,
  DoctorPatientLink,
  Lesson,
  ReferralCode,
  Reminder,
  Role,
  User,
  WeekProgram
} from '../types';

interface ActionResult {
  ok: boolean;
  error?: string;
}

interface AppContextValue {
  users: User[];
  currentUser: User | null;
  weeks: WeekProgram[];
  messages: ChatMessage[];
  referralCodes: ReferralCode[];
  links: DoctorPatientLink[];
  reminders: Reminder[];
  aiSessions: Array<AiSession & { lastMessage?: string }>;
  aiMessages: AiMessage[];
  aiActiveSessionId: string | null;
  isLoading: boolean;
  initError: string | null;
  login: (email: string, password: string) => Promise<ActionResult>;
  logout: () => Promise<void>;
  usersByRole: (role: Role) => User[];
  lessons: Lesson[];
  getDoctorForPatient: (patientId: string) => User | undefined;
  getPatientsForDoctor: (doctorId: string) => User[];
  getMessagesForPair: (firstUserId: string, secondUserId: string) => ChatMessage[];
  sendMessage: (fromId: string, toId: string, text: string) => Promise<ActionResult>;
  createReferralCode: (doctorId: string) => Promise<ReferralCode | null>;
  registerPatientByReferral: (
    fullName: string,
    email: string,
    password: string,
    referralCode: string,
    age?: number
  ) => Promise<ActionResult>;
  updateUser: (userId: string, patch: Partial<User>) => Promise<void>;
  updateLesson: (lessonId: string, patch: Partial<Lesson>) => Promise<void>;
  updateReferralCode: (referralId: string, patch: Partial<ReferralCode>) => Promise<void>;
  createReminder: (
    lessonId: string,
    lessonTitle: string,
    lessonDate: string,
    minutesBefore: number
  ) => Promise<ActionResult>;
  refreshReminders: () => Promise<void>;
  askAi: (message: string) => Promise<ActionResult>;
  openAiSession: (sessionId: string) => Promise<void>;
  refreshAiSessions: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: PropsWithChildren) {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [weeks, setWeeks] = useState<WeekProgram[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [referralCodes, setReferralCodes] = useState<ReferralCode[]>([]);
  const [links, setLinks] = useState<DoctorPatientLink[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [aiSessions, setAiSessions] = useState<Array<AiSession & { lastMessage?: string }>>([]);
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([]);
  const [aiActiveSessionId, setAiActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  const lessons = useMemo(
    () => weeks.flatMap((week) => week.lessons),
    [weeks]
  );

  const applyBootstrap = (payload: {
    currentUser: User;
    users: User[];
    weeks: WeekProgram[];
    messages: ChatMessage[];
    links: DoctorPatientLink[];
    referralCodes: ReferralCode[];
  }) => {
    setCurrentUser(payload.currentUser);
    setUsers(payload.users);
    setWeeks(payload.weeks);
    setMessages(payload.messages);
    setLinks(payload.links);
    setReferralCodes(payload.referralCodes);
  };

  const loadReminders = async (token: string) => {
    try {
      const response = await api.getReminders(token);
      setReminders(response.reminders);
    } catch {
      setReminders([]);
    }
  };

  const loadAiSessions = async (token: string) => {
    try {
      const response = await api.aiSessions(token);
      setAiSessions(response.sessions);

      const shouldLoadFirst =
        !aiActiveSessionId && response.sessions.length > 0 && response.sessions[0]?.id;

      if (shouldLoadFirst) {
        const firstId = response.sessions[0]?.id ?? null;
        if (firstId) {
          const history = await api.aiSessionMessages(token, firstId);
          setAiActiveSessionId(firstId);
          setAiMessages(history.messages);
        }
      }
    } catch {
      setAiSessions([]);
      setAiMessages([]);
      setAiActiveSessionId(null);
    }
  };

  const refreshBootstrap = async (token: string) => {
    const payload = await api.bootstrap(token);
    applyBootstrap(payload);
    await loadReminders(token);
    await loadAiSessions(token);
  };

  const registerPushIfPossible = async (token: string) => {
    const pushToken = await registerForPushToken();
    if (!pushToken) {
      return;
    }

    try {
      await api.registerPushToken(token, pushToken);
    } catch {
      // Non-blocking for auth flow.
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const token = await getToken();
        if (!token) {
          setIsLoading(false);
          return;
        }

        setAuthToken(token);
        await refreshBootstrap(token);
        await registerPushIfPossible(token);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Не удалось инициализировать сессию';
        setInitError(message);
        await clearToken();
        setAuthToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    void init();
  }, []);

  const usersByRole = (role: Role): User[] => users.filter((user) => user.role === role);

  const login = async (email: string, password: string): Promise<ActionResult> => {
    try {
      const result = await api.login(email, password);
      await saveToken(result.token);
      setAuthToken(result.token);
      await refreshBootstrap(result.token);
      await registerPushIfPossible(result.token);
      setInitError(null);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Ошибка входа'
      };
    }
  };

  const registerPatientByReferral = async (
    fullName: string,
    email: string,
    password: string,
    referralCode: string,
    age?: number
  ): Promise<ActionResult> => {
    try {
      const result = await api.registerPatient({
        fullName,
        email,
        password,
        referralCode,
        age
      });
      await saveToken(result.token);
      setAuthToken(result.token);
      await refreshBootstrap(result.token);
      await registerPushIfPossible(result.token);
      setInitError(null);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Не удалось зарегистрироваться'
      };
    }
  };

  const logout = async () => {
    await clearToken();
    setAuthToken(null);
    setCurrentUser(null);
    setUsers([]);
    setWeeks([]);
    setMessages([]);
    setLinks([]);
    setReferralCodes([]);
    setReminders([]);
    setAiSessions([]);
    setAiMessages([]);
    setAiActiveSessionId(null);
  };

  const getDoctorForPatient = (patientId: string): User | undefined => {
    const link = links.find((item) => item.patientId === patientId);
    if (!link) {
      return undefined;
    }
    return users.find((user) => user.id === link.doctorId);
  };

  const getPatientsForDoctor = (doctorId: string): User[] => {
    const patientIds = links
      .filter((item) => item.doctorId === doctorId)
      .map((item) => item.patientId);

    return users.filter((user) => patientIds.includes(user.id));
  };

  const getMessagesForPair = (firstUserId: string, secondUserId: string): ChatMessage[] => {
    return messages
      .filter((message) => {
        const direct = message.fromId === firstUserId && message.toId === secondUserId;
        const reverse = message.fromId === secondUserId && message.toId === firstUserId;
        return direct || reverse;
      })
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  };

  const sendMessage = async (_fromId: string, toId: string, text: string): Promise<ActionResult> => {
    if (!authToken) {
      return { ok: false, error: 'Вы не авторизованы' };
    }

    try {
      const normalized = text.trim();
      if (!normalized) {
        return { ok: false, error: 'Введите текст сообщения' };
      }

      const response = await api.sendMessage(authToken, toId, normalized);
      setMessages((prev) => [...prev, response.message]);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Не удалось отправить сообщение'
      };
    }
  };

  const createReferralCode = async (_doctorId: string): Promise<ReferralCode | null> => {
    if (!authToken) {
      return null;
    }

    try {
      const response = await api.createReferralCode(authToken);
      setReferralCodes((prev) => [response.referralCode, ...prev]);
      return response.referralCode;
    } catch {
      return null;
    }
  };

  const updateUser = async (userId: string, patch: Partial<User>) => {
    if (!authToken || !currentUser) {
      return;
    }

    try {
      const isAdminEditingOthers = currentUser.role === 'admin' && currentUser.id !== userId;
      const response = isAdminEditingOthers
        ? await api.updateUserByAdmin(authToken, userId, patch)
        : await api.updateOwnUser(authToken, patch);

      setUsers((prev) => prev.map((user) => (user.id === userId ? response.user : user)));
      if (currentUser.id === userId) {
        setCurrentUser(response.user);
      }
    } catch {
      // Keep UI stable; server source-of-truth can be refreshed later.
    }
  };

  const updateLesson = async (lessonId: string, patch: Partial<Lesson>) => {
    if (!authToken) {
      return;
    }

    try {
      const response = await api.updateLesson(authToken, lessonId, patch);
      setWeeks((prev) =>
        prev.map((week) => ({
          ...week,
          lessons: week.lessons.map((lesson) =>
            lesson.id === lessonId
              ? {
                  ...lesson,
                  ...response.lesson
                }
              : lesson
          )
        }))
      );
    } catch {
      // Ignored in prototype UI.
    }
  };

  const updateReferralCode = async (referralId: string, patch: Partial<ReferralCode>) => {
    if (!authToken || typeof patch.active !== 'boolean') {
      return;
    }

    try {
      const response = await api.toggleReferralCode(authToken, referralId, patch.active);
      setReferralCodes((prev) =>
        prev.map((item) => (item.id === referralId ? response.referralCode : item))
      );
    } catch {
      // Ignored in prototype UI.
    }
  };

  const createReminder = async (
    lessonId: string,
    lessonTitle: string,
    lessonDate: string,
    minutesBefore: number
  ): Promise<ActionResult> => {
    if (!authToken) {
      return { ok: false, error: 'Вы не авторизованы' };
    }

    try {
      await api.createReminder(authToken, lessonId, minutesBefore);
      await scheduleLocalLessonReminder(lessonTitle, lessonDate, minutesBefore);
      await loadReminders(authToken);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Не удалось создать напоминание'
      };
    }
  };

  const refreshReminders = async () => {
    if (!authToken) {
      return;
    }
    await loadReminders(authToken);
  };

  const refreshAiSessions = async () => {
    if (!authToken) {
      return;
    }
    await loadAiSessions(authToken);
  };

  const openAiSession = async (sessionId: string) => {
    if (!authToken) {
      return;
    }
    const response = await api.aiSessionMessages(authToken, sessionId);
    setAiActiveSessionId(response.session.id);
    setAiMessages(response.messages);
  };

  const askAi = async (message: string): Promise<ActionResult> => {
    if (!authToken) {
      return { ok: false, error: 'Вы не авторизованы' };
    }

    const normalized = message.trim();
    if (!normalized) {
      return { ok: false, error: 'Введите сообщение для AI' };
    }

    try {
      const response = await api.aiChat(authToken, normalized, aiActiveSessionId ?? undefined);
      setAiActiveSessionId(response.session.id);
      setAiMessages(response.messages);
      await loadAiSessions(authToken);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Не удалось получить ответ AI'
      };
    }
  };

  const value: AppContextValue = {
    users,
    currentUser,
    weeks,
    messages,
    referralCodes,
    links,
    reminders,
    aiSessions,
    aiMessages,
    aiActiveSessionId,
    isLoading,
    initError,
    login,
    logout,
    usersByRole,
    lessons,
    getDoctorForPatient,
    getPatientsForDoctor,
    getMessagesForPair,
    sendMessage,
    createReferralCode,
    registerPatientByReferral,
    updateUser,
    updateLesson,
    updateReferralCode,
    createReminder,
    refreshReminders,
    askAi,
    openAiSession,
    refreshAiSessions
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppData(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppData must be used inside AppProvider');
  }
  return context;
}
