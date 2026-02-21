export type Role = 'patient' | 'doctor' | 'admin';

export interface User {
  id: string;
  role: Role;
  fullName: string;
  email: string;
  age?: number;
  specialty?: string;
  about?: string;
}

export interface Lesson {
  id: string;
  weekNumber: number;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  audioUrl: string;
  durationMin: number;
}

export interface WeekProgram {
  id: string;
  weekNumber: number;
  title: string;
  lessons: Lesson[];
}

export interface ReferralCode {
  id: string;
  code: string;
  doctorId: string;
  active: boolean;
  usedByPatientId?: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  fromId: string;
  toId: string;
  text: string;
  createdAt: string;
}

export interface DoctorPatientLink {
  doctorId: string;
  patientId: string;
}

export interface Reminder {
  id: string;
  lessonId: string;
  lessonTitle: string;
  remindAt: string;
  status: string;
}
