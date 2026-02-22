import { AiMessage, AiSession, ChatMessage, Lesson, ReferralCode, User, WeekProgram } from '../types';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api';

interface ApiError {
  error?: {
    message?: string;
  };
}

interface BootstrapResponse {
  currentUser: User;
  users: User[];
  weeks: WeekProgram[];
  messages: ChatMessage[];
  links: { doctorId: string; patientId: string }[];
  referralCodes: ReferralCode[];
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  token?: string | null
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {})
    }
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiError;
    throw new Error(body.error?.message ?? `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  async login(email: string, password: string) {
    return request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  async registerPatient(payload: {
    fullName: string;
    email: string;
    password: string;
    referralCode: string;
    age?: number;
  }) {
    return request<{ token: string; user: User }>('/auth/register-patient', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async me(token: string) {
    return request<{ user: User }>('/auth/me', {}, token);
  },

  async bootstrap(token: string) {
    return request<BootstrapResponse>('/bootstrap', {}, token);
  },

  async updateOwnUser(token: string, patch: Partial<User>) {
    return request<{ user: User }>(
      '/users/me',
      {
        method: 'PATCH',
        body: JSON.stringify(patch)
      },
      token
    );
  },

  async updateUserByAdmin(token: string, userId: string, patch: Partial<User>) {
    return request<{ user: User }>(
      `/users/${userId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(patch)
      },
      token
    );
  },

  async updateLesson(token: string, lessonId: string, patch: Partial<Lesson>) {
    return request<{ lesson: Lesson }>(
      `/weeks/lessons/${lessonId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(patch)
      },
      token
    );
  },

  async sendMessage(token: string, toId: string, text: string) {
    return request<{ message: ChatMessage }>(
      '/chat/messages',
      {
        method: 'POST',
        body: JSON.stringify({ toId, text })
      },
      token
    );
  },

  async createReferralCode(token: string) {
    return request<{ referralCode: ReferralCode }>(
      '/referrals',
      {
        method: 'POST'
      },
      token
    );
  },

  async toggleReferralCode(token: string, referralId: string, active: boolean) {
    return request<{ referralCode: ReferralCode }>(
      `/referrals/${referralId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ active })
      },
      token
    );
  },

  async registerPushToken(token: string, expoPushToken: string) {
    return request<{ token: { id: string } }>(
      '/notifications/tokens',
      {
        method: 'POST',
        body: JSON.stringify({ token: expoPushToken })
      },
      token
    );
  },

  async createReminder(token: string, lessonId: string, minutesBefore: number) {
    return request<{ reminder: { id: string; remindAt: string } }>(
      '/notifications/reminders',
      {
        method: 'POST',
        body: JSON.stringify({ lessonId, minutesBefore })
      },
      token
    );
  },

  async getReminders(token: string) {
    return request<{
      reminders: Array<{
        id: string;
        lessonId: string;
        lessonTitle: string;
        remindAt: string;
        status: string;
      }>;
    }>('/notifications/reminders', {}, token);
  },

  async aiChat(token: string, message: string, sessionId?: string) {
    return request<{
      session: AiSession;
      answer: AiMessage;
      messages: AiMessage[];
    }>(
      '/ai/chat',
      {
        method: 'POST',
        body: JSON.stringify({ message, sessionId })
      },
      token
    );
  },

  async aiSessions(token: string) {
    return request<{
      sessions: Array<AiSession & { lastMessage?: string }>;
    }>('/ai/sessions', {}, token);
  },

  async aiSessionMessages(token: string, sessionId: string) {
    return request<{
      session: AiSession;
      messages: AiMessage[];
    }>(`/ai/sessions/${sessionId}/messages`, {}, token);
  }
};
