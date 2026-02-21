import { ChatMessage, Lesson, ReferralCode, Reminder, User, WeekProgram } from './types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

interface ApiError {
  error?: {
    message?: string;
  };
}

async function request<T>(path: string, init: RequestInit = {}, token?: string | null): Promise<T> {
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
    throw new Error(body.error?.message ?? `Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export const api = {
  login(email: string, password: string) {
    return request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  registerPatient(payload: {
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

  bootstrap(token: string) {
    return request<{
      currentUser: User;
      users: User[];
      weeks: WeekProgram[];
      messages: ChatMessage[];
      links: { doctorId: string; patientId: string }[];
      referralCodes: ReferralCode[];
    }>('/bootstrap', {}, token);
  },

  updateOwnUser(token: string, patch: Partial<User>) {
    return request<{ user: User }>(
      '/users/me',
      {
        method: 'PATCH',
        body: JSON.stringify(patch)
      },
      token
    );
  },

  updateUserByAdmin(token: string, userId: string, patch: Partial<User>) {
    return request<{ user: User }>(
      `/users/${userId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(patch)
      },
      token
    );
  },

  updateLesson(token: string, lessonId: string, patch: Partial<Lesson>) {
    return request<{ lesson: Lesson }>(
      `/weeks/lessons/${lessonId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(patch)
      },
      token
    );
  },

  sendMessage(token: string, toId: string, text: string) {
    return request<{ message: ChatMessage }>(
      '/chat/messages',
      {
        method: 'POST',
        body: JSON.stringify({ toId, text })
      },
      token
    );
  },

  createReferralCode(token: string) {
    return request<{ referralCode: ReferralCode }>(
      '/referrals',
      {
        method: 'POST'
      },
      token
    );
  },

  toggleReferralCode(token: string, referralId: string, active: boolean) {
    return request<{ referralCode: ReferralCode }>(
      `/referrals/${referralId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ active })
      },
      token
    );
  },

  createReminder(token: string, lessonId: string, minutesBefore: number) {
    return request<{ reminder: { id: string; remindAt: string } }>(
      '/notifications/reminders',
      {
        method: 'POST',
        body: JSON.stringify({ lessonId, minutesBefore })
      },
      token
    );
  },

  getReminders(token: string) {
    return request<{ reminders: Reminder[] }>('/notifications/reminders', {}, token);
  }
};
