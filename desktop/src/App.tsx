import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from './api';
import { ChatMessage, Lesson, ReferralCode, Reminder, Role, User, WeekProgram } from './types';

declare global {
  interface Window {
    desktopInfo?: {
      platform: string;
      versions: Record<string, string>;
    };
  }
}

type Tab = 'home' | 'calendar' | 'chat' | 'tools' | 'profile';

const TOKEN_KEY = 'mob_health_desktop_token';

const roleLabel: Record<Role, string> = {
  patient: 'Пациент',
  doctor: 'Врач',
  admin: 'Админ'
};

const demoUsers = [
  { label: 'Пациент', email: 'anna@example.com', password: 'patient123' },
  { label: 'Врач', email: 'e.orlova@clinic.com', password: 'doctor123' },
  { label: 'Админ', email: 'admin@mobhealth.app', password: 'admin123' }
];

interface UserDraft {
  fullName: string;
  email: string;
  about: string;
  ageOrSpecialty: string;
}

interface LessonDraft {
  title: string;
  description: string;
  date: string;
  durationMin: string;
}

export function App() {
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [weeks, setWeeks] = useState<WeekProgram[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [links, setLinks] = useState<Array<{ doctorId: string; patientId: string }>>([]);
  const [referralCodes, setReferralCodes] = useState<ReferralCode[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('home');

  const [loginEmail, setLoginEmail] = useState('anna@example.com');
  const [loginPassword, setLoginPassword] = useState('patient123');
  const [loginError, setLoginError] = useState<string | null>(null);

  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerReferral, setRegisterReferral] = useState('');
  const [registerAge, setRegisterAge] = useState('');
  const [registerError, setRegisterError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [chatDraft, setChatDraft] = useState('');
  const [chatError, setChatError] = useState<string | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [reminderStatus, setReminderStatus] = useState<string | null>(null);
  const [doctorStatus, setDoctorStatus] = useState<string | null>(null);

  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileAbout, setProfileAbout] = useState('');
  const [profileAgeOrSpec, setProfileAgeOrSpec] = useState('');
  const [profileStatus, setProfileStatus] = useState<string | null>(null);

  const [userDrafts, setUserDrafts] = useState<Record<string, UserDraft>>({});
  const [lessonDrafts, setLessonDrafts] = useState<Record<string, LessonDraft>>({});

  const allLessons = useMemo(() => weeks.flatMap((week) => week.lessons), [weeks]);

  const usersByRole = (role: Role) => users.filter((item) => item.role === role);

  const getDoctorForPatient = (patientId: string) => {
    const link = links.find((item) => item.patientId === patientId);
    if (!link) {
      return undefined;
    }
    return users.find((user) => user.id === link.doctorId);
  };

  const getPatientsForDoctor = (doctorId: string) => {
    const patientIds = links.filter((item) => item.doctorId === doctorId).map((item) => item.patientId);
    return users.filter((user) => patientIds.includes(user.id));
  };

  const getMessagesForPair = (aId: string, bId: string) =>
    messages
      .filter(
        (msg) =>
          (msg.fromId === aId && msg.toId === bId) ||
          (msg.fromId === bId && msg.toId === aId)
      )
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const saveToken = (nextToken: string | null) => {
    setToken(nextToken);
    if (nextToken) {
      localStorage.setItem(TOKEN_KEY, nextToken);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  };

  const applyBootstrap = (data: {
    currentUser: User;
    users: User[];
    weeks: WeekProgram[];
    messages: ChatMessage[];
    links: Array<{ doctorId: string; patientId: string }>;
    referralCodes: ReferralCode[];
  }) => {
    setCurrentUser(data.currentUser);
    setUsers(data.users);
    setWeeks(data.weeks);
    setMessages(data.messages);
    setLinks(data.links);
    setReferralCodes(data.referralCodes);
  };

  const loadReminders = async (authToken: string) => {
    try {
      const response = await api.getReminders(authToken);
      setReminders(response.reminders);
    } catch {
      setReminders([]);
    }
  };

  const refreshBootstrap = async (authToken: string) => {
    const data = await api.bootstrap(authToken);
    applyBootstrap(data);
    await loadReminders(authToken);
  };

  useEffect(() => {
    const init = async () => {
      const saved = localStorage.getItem(TOKEN_KEY);
      if (!saved) {
        setIsLoading(false);
        return;
      }

      try {
        saveToken(saved);
        await refreshBootstrap(saved);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Ошибка инициализации';
        setGlobalError(message);
        saveToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    void init();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    setProfileName(currentUser.fullName);
    setProfileEmail(currentUser.email);
    setProfileAbout(currentUser.about ?? '');
    setProfileAgeOrSpec(
      currentUser.role === 'patient' ? String(currentUser.age ?? '') : currentUser.specialty ?? ''
    );
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    if (currentUser.role === 'doctor') {
      const doctorPatients = getPatientsForDoctor(currentUser.id);
      setSelectedPatientId((prev) => prev ?? doctorPatients[0]?.id ?? null);
    }

    if (currentUser.role === 'admin') {
      const doctors = usersByRole('doctor');
      const pickedDoctorId = selectedDoctorId ?? doctors[0]?.id ?? null;
      setSelectedDoctorId(pickedDoctorId);

      const linkedPatients = links
        .filter((item) => item.doctorId === pickedDoctorId)
        .map((item) => users.find((u) => u.id === item.patientId))
        .filter((u): u is User => Boolean(u));

      setSelectedPatientId((prev) => prev ?? linkedPatients[0]?.id ?? null);
    }
  }, [currentUser, links, selectedDoctorId, users]);

  useEffect(() => {
    const map = users.reduce<Record<string, UserDraft>>((acc, user) => {
      acc[user.id] = {
        fullName: user.fullName,
        email: user.email,
        about: user.about ?? '',
        ageOrSpecialty: user.role === 'patient' ? String(user.age ?? '') : user.specialty ?? ''
      };
      return acc;
    }, {});
    setUserDrafts(map);
  }, [users]);

  useEffect(() => {
    const map = allLessons.reduce<Record<string, LessonDraft>>((acc, lesson) => {
      acc[lesson.id] = {
        title: lesson.title,
        description: lesson.description,
        date: lesson.date,
        durationMin: String(lesson.durationMin)
      };
      return acc;
    }, {});
    setLessonDrafts(map);
  }, [allLessons]);

  const onLogin = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setLoginError(null);
      const response = await api.login(loginEmail, loginPassword);
      saveToken(response.token);
      await refreshBootstrap(response.token);
      setGlobalError(null);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Ошибка входа');
    }
  };

  const onRegister = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setRegisterError(null);
      const response = await api.registerPatient({
        fullName: registerName,
        email: registerEmail,
        password: registerPassword,
        referralCode: registerReferral,
        age: registerAge ? Number(registerAge) : undefined
      });
      saveToken(response.token);
      await refreshBootstrap(response.token);
      setRegisterName('');
      setRegisterEmail('');
      setRegisterPassword('');
      setRegisterReferral('');
      setRegisterAge('');
    } catch (error) {
      setRegisterError(error instanceof Error ? error.message : 'Ошибка регистрации');
    }
  };

  const onLogout = () => {
    saveToken(null);
    setCurrentUser(null);
    setUsers([]);
    setWeeks([]);
    setMessages([]);
    setLinks([]);
    setReferralCodes([]);
    setReminders([]);
    setTab('home');
  };

  const onSendMessage = async () => {
    if (!token || !currentUser) {
      return;
    }

    let targetUserId: string | null = null;

    if (currentUser.role === 'patient') {
      targetUserId = getDoctorForPatient(currentUser.id)?.id ?? null;
    } else if (currentUser.role === 'doctor') {
      targetUserId = selectedPatientId;
    }

    if (!targetUserId) {
      setChatError('Выберите собеседника');
      return;
    }

    try {
      const response = await api.sendMessage(token, targetUserId, chatDraft);
      setMessages((prev) => [...prev, response.message]);
      setChatDraft('');
      setChatError(null);
    } catch (error) {
      setChatError(error instanceof Error ? error.message : 'Не удалось отправить');
    }
  };

  const onCreateReferral = async () => {
    if (!token) {
      return;
    }

    try {
      const response = await api.createReferralCode(token);
      setReferralCodes((prev) => [response.referralCode, ...prev]);
      setDoctorStatus(`Код ${response.referralCode.code} создан`);
    } catch (error) {
      setDoctorStatus(error instanceof Error ? error.message : 'Ошибка создания кода');
    }
  };

  const onToggleReferral = async (referralId: string, active: boolean) => {
    if (!token) {
      return;
    }

    try {
      const response = await api.toggleReferralCode(token, referralId, active);
      setReferralCodes((prev) =>
        prev.map((item) => (item.id === referralId ? response.referralCode : item))
      );
    } catch {
      setGlobalError('Не удалось обновить реферальный код');
    }
  };

  const onCreateReminder = async (lessonId: string, minutesBefore: number) => {
    if (!token) {
      return;
    }

    try {
      await api.createReminder(token, lessonId, minutesBefore);
      await loadReminders(token);
      setReminderStatus('Напоминание создано');
    } catch (error) {
      setReminderStatus(error instanceof Error ? error.message : 'Не удалось создать напоминание');
    }
  };

  const onSaveProfile = async () => {
    if (!token || !currentUser) {
      return;
    }

    try {
      const response = await api.updateOwnUser(token, {
        fullName: profileName,
        email: profileEmail,
        about: profileAbout,
        ...(currentUser.role === 'patient'
          ? { age: profileAgeOrSpec ? Number(profileAgeOrSpec) : undefined }
          : { specialty: profileAgeOrSpec || undefined })
      });

      setUsers((prev) => prev.map((item) => (item.id === response.user.id ? response.user : item)));
      setCurrentUser(response.user);
      setProfileStatus('Профиль обновлен');
    } catch (error) {
      setProfileStatus(error instanceof Error ? error.message : 'Ошибка сохранения');
    }
  };

  const onSaveUserByAdmin = async (userId: string) => {
    const draft = userDrafts[userId];
    if (!token || !draft) {
      return;
    }

    const original = users.find((item) => item.id === userId);
    if (!original) {
      return;
    }

    try {
      const response = await api.updateUserByAdmin(token, userId, {
        fullName: draft.fullName,
        email: draft.email,
        about: draft.about,
        ...(original.role === 'patient'
          ? { age: draft.ageOrSpecialty ? Number(draft.ageOrSpecialty) : undefined }
          : { specialty: draft.ageOrSpecialty || undefined })
      });

      setUsers((prev) => prev.map((item) => (item.id === userId ? response.user : item)));
    } catch {
      setGlobalError('Ошибка сохранения пользователя');
    }
  };

  const onSaveLessonByAdmin = async (lessonId: string) => {
    const draft = lessonDrafts[lessonId];
    if (!token || !draft) {
      return;
    }

    try {
      const response = await api.updateLesson(token, lessonId, {
        title: draft.title,
        description: draft.description,
        date: draft.date,
        durationMin: Number(draft.durationMin) || undefined
      });

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
      setGlobalError('Ошибка сохранения урока');
    }
  };

  const updateUserDraft = (userId: string, field: keyof UserDraft, value: string) => {
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

  const updateLessonDraft = (lessonId: string, field: keyof LessonDraft, value: string) => {
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

  if (isLoading) {
    return <div className="loader">Инициализация desktop-приложения...</div>;
  }

  if (!currentUser) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>MobHealth Desktop</h1>
          <p>Клиент для ПК (Windows/macOS/Linux), работающий с PostgreSQL backend.</p>
          <form onSubmit={onLogin} className="auth-form">
            <h3>Вход</h3>
            <input value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="Email" />
            <input
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="Пароль"
              type="password"
            />
            <button type="submit">Войти</button>
            {loginError ? <div className="error">{loginError}</div> : null}
            <div className="demo-row">
              {demoUsers.map((demo) => (
                <button
                  key={demo.email}
                  type="button"
                  className="ghost"
                  onClick={() => {
                    setLoginEmail(demo.email);
                    setLoginPassword(demo.password);
                  }}
                >
                  {demo.label}
                </button>
              ))}
            </div>
          </form>

          <form onSubmit={onRegister} className="auth-form">
            <h3>Регистрация пациента по коду</h3>
            <input value={registerName} onChange={(e) => setRegisterName(e.target.value)} placeholder="ФИО" />
            <input
              value={registerEmail}
              onChange={(e) => setRegisterEmail(e.target.value)}
              placeholder="Email"
            />
            <input
              value={registerPassword}
              onChange={(e) => setRegisterPassword(e.target.value)}
              placeholder="Пароль"
              type="password"
            />
            <input
              value={registerReferral}
              onChange={(e) => setRegisterReferral(e.target.value)}
              placeholder="Реферальный код"
            />
            <input
              value={registerAge}
              onChange={(e) => setRegisterAge(e.target.value)}
              placeholder="Возраст (необязательно)"
            />
            <button type="submit">Создать аккаунт</button>
            {registerError ? <div className="error">{registerError}</div> : null}
          </form>

          {globalError ? <div className="error">{globalError}</div> : null}
        </div>
      </div>
    );
  }

  let chatPeer: User | null = null;
  if (currentUser.role === 'patient') {
    chatPeer = getDoctorForPatient(currentUser.id) ?? null;
  }
  if (currentUser.role === 'doctor') {
    chatPeer = users.find((u) => u.id === selectedPatientId) ?? null;
  }

  const chatMessages =
    currentUser.role === 'admin'
      ? (() => {
          const doctorId = selectedDoctorId;
          const patientId = selectedPatientId;
          if (!doctorId || !patientId) {
            return [];
          }
          return getMessagesForPair(doctorId, patientId);
        })()
      : chatPeer
        ? getMessagesForPair(currentUser.id, chatPeer.id)
        : [];

  const lessonsByDate = allLessons.filter((lesson) => lesson.date === selectedDate);

  const doctorPatientsForAdmin = links
    .filter((item) => item.doctorId === selectedDoctorId)
    .map((item) => users.find((u) => u.id === item.patientId))
    .filter((u): u is User => Boolean(u));

  return (
    <div className="layout">
      <aside className="sidebar">
        <h2>MobHealth</h2>
        <div className="role-badge">{roleLabel[currentUser.role]}</div>
        <div className="meta">
          <strong>{currentUser.fullName}</strong>
          <span>{currentUser.email}</span>
        </div>

        <div className="nav-buttons">
          <button className={tab === 'home' ? 'active' : ''} onClick={() => setTab('home')}>Главная</button>
          <button className={tab === 'calendar' ? 'active' : ''} onClick={() => setTab('calendar')}>Календарь</button>
          <button className={tab === 'chat' ? 'active' : ''} onClick={() => setTab('chat')}>Чат</button>
          <button className={tab === 'tools' ? 'active' : ''} onClick={() => setTab('tools')}>Инструменты</button>
          <button className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}>Профиль</button>
        </div>

        <button className="logout" onClick={onLogout}>Выйти</button>

        <div className="desktop-meta">{window.desktopInfo?.platform ?? 'desktop'} client</div>
      </aside>

      <main className="content">
        {tab === 'home' ? (
          <div className="panel">
            <h3>Программа по неделям</h3>
            <p className="subtitle">Аутогенные тренировки с аудио-контентом</p>
            {weeks.map((week) => (
              <div key={week.id} className="card">
                <h4>{week.title}</h4>
                {week.lessons.map((lesson) => (
                  <div key={lesson.id} className="lesson">
                    <div className="row-between">
                      <strong>{lesson.title}</strong>
                      <span>{lesson.date}</span>
                    </div>
                    <p>{lesson.description}</p>
                    <audio controls src={lesson.audioUrl} preload="none" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : null}

        {tab === 'calendar' ? (
          <div className="panel">
            <h3>Календарь уроков</h3>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
            <div className="card">
              <h4>Уроки на {selectedDate}</h4>
              {lessonsByDate.length === 0 ? <p>На эту дату уроков нет.</p> : null}
              {lessonsByDate.map((lesson) => (
                <div key={lesson.id} className="lesson">
                  <div className="row-between">
                    <strong>{lesson.title}</strong>
                    <span>{lesson.durationMin} мин</span>
                  </div>
                  <p>{lesson.description}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {tab === 'chat' ? (
          <div className="panel">
            <h3>Чат</h3>

            {currentUser.role === 'doctor' ? (
              <select value={selectedPatientId ?? ''} onChange={(e) => setSelectedPatientId(e.target.value)}>
                <option value="">Выберите пациента</option>
                {getPatientsForDoctor(currentUser.id).map((patient) => (
                  <option key={patient.id} value={patient.id}>{patient.fullName}</option>
                ))}
              </select>
            ) : null}

            {currentUser.role === 'admin' ? (
              <div className="row">
                <select value={selectedDoctorId ?? ''} onChange={(e) => setSelectedDoctorId(e.target.value)}>
                  <option value="">Выберите врача</option>
                  {usersByRole('doctor').map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>{doctor.fullName}</option>
                  ))}
                </select>
                <select value={selectedPatientId ?? ''} onChange={(e) => setSelectedPatientId(e.target.value)}>
                  <option value="">Выберите пациента</option>
                  {doctorPatientsForAdmin.map((patient) => (
                    <option key={patient.id} value={patient.id}>{patient.fullName}</option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="card chat-box">
              {chatMessages.length === 0 ? <p>Пока нет сообщений.</p> : null}
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`message ${msg.fromId === currentUser.id ? 'mine' : 'peer'}`}
                >
                  <div>{msg.text}</div>
                  <small>{new Date(msg.createdAt).toLocaleString()}</small>
                </div>
              ))}
            </div>

            {currentUser.role !== 'admin' ? (
              <div className="row">
                <textarea
                  value={chatDraft}
                  onChange={(e) => setChatDraft(e.target.value)}
                  placeholder="Введите сообщение"
                />
                <button onClick={onSendMessage}>Отправить</button>
              </div>
            ) : (
              <p>Админ может только просматривать чат.</p>
            )}
            {chatError ? <div className="error">{chatError}</div> : null}
          </div>
        ) : null}

        {tab === 'tools' ? (
          <div className="panel">
            <h3>Инструменты</h3>

            {currentUser.role === 'patient' ? (
              <div className="card">
                <h4>Напоминания</h4>
                {allLessons.map((lesson) => (
                  <div className="row-between" key={lesson.id}>
                    <span>{lesson.title}</span>
                    <div className="row">
                      <button onClick={() => onCreateReminder(lesson.id, 30)}>За 30 мин</button>
                      <button onClick={() => onCreateReminder(lesson.id, 60)}>За 60 мин</button>
                    </div>
                  </div>
                ))}
                {reminderStatus ? <p>{reminderStatus}</p> : null}
                <hr />
                <h4>Созданные напоминания</h4>
                {reminders.map((item) => (
                  <div className="row-between" key={item.id}>
                    <span>{item.lessonTitle}</span>
                    <span>{new Date(item.remindAt).toLocaleString()} [{item.status}]</span>
                  </div>
                ))}
              </div>
            ) : null}

            {currentUser.role === 'doctor' ? (
              <div className="card">
                <h4>Реферальные коды</h4>
                <button onClick={onCreateReferral}>Создать код</button>
                {doctorStatus ? <p>{doctorStatus}</p> : null}
                {referralCodes
                  .filter((item) => item.doctorId === currentUser.id)
                  .map((item) => (
                    <div key={item.id} className="row-between">
                      <strong>{item.code}</strong>
                      <span>{item.active ? 'Активен' : 'Использован/отключен'}</span>
                    </div>
                  ))}
              </div>
            ) : null}

            {currentUser.role === 'admin' ? (
              <>
                <div className="card">
                  <h4>Редактирование пользователей</h4>
                  {users.map((user) => {
                    const draft = userDrafts[user.id];
                    if (!draft) {
                      return null;
                    }

                    return (
                      <div key={user.id} className="admin-item">
                        <strong>{roleLabel[user.role]}: {user.fullName}</strong>
                        <input
                          value={draft.fullName}
                          onChange={(e) => updateUserDraft(user.id, 'fullName', e.target.value)}
                        />
                        <input
                          value={draft.email}
                          onChange={(e) => updateUserDraft(user.id, 'email', e.target.value)}
                        />
                        <input
                          value={draft.ageOrSpecialty}
                          onChange={(e) => updateUserDraft(user.id, 'ageOrSpecialty', e.target.value)}
                          placeholder={user.role === 'patient' ? 'Возраст' : 'Специализация'}
                        />
                        <textarea
                          value={draft.about}
                          onChange={(e) => updateUserDraft(user.id, 'about', e.target.value)}
                        />
                        <button onClick={() => onSaveUserByAdmin(user.id)}>Сохранить</button>
                      </div>
                    );
                  })}
                </div>

                <div className="card">
                  <h4>Редактирование уроков</h4>
                  {allLessons.map((lesson) => {
                    const draft = lessonDrafts[lesson.id];
                    if (!draft) {
                      return null;
                    }

                    return (
                      <div key={lesson.id} className="admin-item">
                        <strong>{lesson.title}</strong>
                        <input
                          value={draft.title}
                          onChange={(e) => updateLessonDraft(lesson.id, 'title', e.target.value)}
                        />
                        <textarea
                          value={draft.description}
                          onChange={(e) => updateLessonDraft(lesson.id, 'description', e.target.value)}
                        />
                        <input
                          value={draft.date}
                          onChange={(e) => updateLessonDraft(lesson.id, 'date', e.target.value)}
                        />
                        <input
                          value={draft.durationMin}
                          onChange={(e) => updateLessonDraft(lesson.id, 'durationMin', e.target.value)}
                        />
                        <button onClick={() => onSaveLessonByAdmin(lesson.id)}>Сохранить</button>
                      </div>
                    );
                  })}
                </div>

                <div className="card">
                  <h4>Реферальные коды</h4>
                  {referralCodes.map((item) => (
                    <div key={item.id} className="row-between">
                      <strong>{item.code}</strong>
                      <button onClick={() => onToggleReferral(item.id, !item.active)}>
                        {item.active ? 'Отключить' : 'Активировать'}
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        ) : null}

        {tab === 'profile' ? (
          <div className="panel">
            <h3>Профиль</h3>
            <div className="card">
              <input value={profileName} onChange={(e) => setProfileName(e.target.value)} />
              <input value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} />
              <input
                value={profileAgeOrSpec}
                onChange={(e) => setProfileAgeOrSpec(e.target.value)}
                placeholder={currentUser.role === 'patient' ? 'Возраст' : 'Специализация'}
              />
              <textarea value={profileAbout} onChange={(e) => setProfileAbout(e.target.value)} />
              <button onClick={onSaveProfile}>Сохранить</button>
              {profileStatus ? <p>{profileStatus}</p> : null}
            </div>
          </div>
        ) : null}

        {globalError ? <div className="error sticky">{globalError}</div> : null}
      </main>
    </div>
  );
}
