import { AIMessageRole, AISubagent, PrismaClient, Role, User } from '@prisma/client';

interface AgentReply {
  subagent: AISubagent;
  answer: string;
  actionType?: string;
  actionPayload?: Record<string, unknown>;
}

interface AgentContextMessage {
  role: AIMessageRole;
  content: string;
  createdAt: Date;
}

interface AgentContext {
  history?: AgentContextMessage[];
}

type Intent = 'sleep' | 'schedule' | 'anxiety' | 'progress' | 'summary' | 'referral' | 'risk' | 'general';

function toDateLabel(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function pickVariant(seed: string, variants: string[]): string {
  if (!variants.length) {
    return '';
  }
  const index = hashString(seed) % variants.length;
  return variants[index] ?? variants[0] ?? '';
}

function clipText(value: string, max = 100): string {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, Math.max(0, max - 1)).trim()}…`;
}

function buildSafeIntro(subagent: AISubagent): string {
  if (subagent === AISubagent.PATIENT_COACH) {
    return 'I am your AI patient coach. This is supportive guidance and does not replace a doctor.';
  }

  if (subagent === AISubagent.DOCTOR_ASSISTANT) {
    return 'I am your AI doctor assistant. Use this as draft support, final decisions are yours.';
  }

  return 'I am your AI admin assistant. Recommendations are based on current app data snapshot.';
}

function pickSubagent(role: Role): AISubagent {
  if (role === Role.PATIENT) {
    return AISubagent.PATIENT_COACH;
  }

  if (role === Role.DOCTOR) {
    return AISubagent.DOCTOR_ASSISTANT;
  }

  return AISubagent.ADMIN_ASSISTANT;
}

function hasKeyword(text: string, keywords: string[]): boolean {
  const normalized = normalizeText(text);
  return keywords.some((keyword) => normalized.includes(keyword));
}

function detectIntent(subagent: AISubagent, message: string): Intent {
  if (subagent === AISubagent.PATIENT_COACH) {
    if (hasKeyword(message, ['sleep', 'insomnia', 'сон', 'бессон'])) {
      return 'sleep';
    }
    if (hasKeyword(message, ['calendar', 'schedule', 'lesson', 'урок', 'распис', 'календар'])) {
      return 'schedule';
    }
    if (hasKeyword(message, ['anxiety', 'stress', 'panic', 'тревог', 'стресс', 'паник'])) {
      return 'anxiety';
    }
    if (hasKeyword(message, ['progress', 'motivat', 'plan', 'прогресс', 'план', 'мотивац'])) {
      return 'progress';
    }
    return 'general';
  }

  if (subagent === AISubagent.DOCTOR_ASSISTANT) {
    if (hasKeyword(message, ['summary', 'patient', 'patients', 'саммари', 'свод', 'пациент'])) {
      return 'summary';
    }
    if (hasKeyword(message, ['referral', 'invite', 'code', 'рефера', 'код'])) {
      return 'referral';
    }
    return 'general';
  }

  if (hasKeyword(message, ['risk', 'anomaly', 'incident', 'риски', 'аном', 'инцидент'])) {
    return 'risk';
  }

  return 'general';
}

function getHistoryInsights(
  message: string,
  history: AgentContextMessage[] = []
): { totalMessages: number; previousUserMessage: string | null; repeatedQuestion: boolean; followUp: boolean } {
  const normalizedCurrent = normalizeText(message);
  const userHistory = history
    .filter((item) => item.role === AIMessageRole.USER)
    .map((item) => item.content.trim())
    .filter((item) => item.length > 0);

  const previousUserMessages = userHistory.slice(0, Math.max(0, userHistory.length - 1));
  const previousUserMessage = previousUserMessages.length
    ? (previousUserMessages[previousUserMessages.length - 1] ?? null)
    : null;

  const repeatedQuestion = previousUserMessages.some((item) => normalizeText(item) === normalizedCurrent);
  const followUp =
    hasKeyword(message, ['more', 'detail', 'clarify', 'дальше', 'подробнее', 'уточни']) ||
    hasKeyword(message, ['ещё', 'еще', 'continue', 'next']);

  return {
    totalMessages: history.length,
    previousUserMessage,
    repeatedQuestion,
    followUp
  };
}

function continuityLine(previousUserMessage: string | null): string {
  if (!previousUserMessage) {
    return '';
  }
  return `Session context: previous topic was "${clipText(previousUserMessage, 70)}".`;
}

async function patientCoach(
  prisma: PrismaClient,
  user: User,
  message: string,
  context: AgentContext
): Promise<AgentReply> {
  const today = new Date(new Date().toISOString().slice(0, 10));

  const [upcomingLessons, assignedDoctor, pendingReminders] = await Promise.all([
    prisma.lesson.findMany({
      where: {
        date: {
          gte: today
        }
      },
      orderBy: {
        date: 'asc'
      },
      include: {
        weekProgram: {
          select: {
            weekNumber: true,
            title: true
          }
        }
      },
      take: 5
    }),
    prisma.doctorPatientLink.findUnique({
      where: {
        patientId: user.id
      },
      include: {
        doctor: {
          select: {
            fullName: true,
            specialty: true
          }
        }
      }
    }),
    prisma.lessonReminder.count({
      where: {
        userId: user.id,
        status: 'PENDING'
      }
    })
  ]);

  const intro = buildSafeIntro(AISubagent.PATIENT_COACH);
  const intent = detectIntent(AISubagent.PATIENT_COACH, message);
  const historyInsights = getHistoryInsights(message, context.history);
  const seed = `${message}|${historyInsights.totalMessages}|${intent}`;

  const contextHint = continuityLine(historyInsights.previousUserMessage);
  const repeatHint = historyInsights.repeatedQuestion
    ? 'You asked a similar question earlier, so this time I will give an alternative angle.'
    : '';
  const followUpHint = historyInsights.followUp ? 'I will keep this answer focused and continue from your previous thread.' : '';

  if (intent === 'sleep') {
    const sleepLessons = upcomingLessons.filter(
      (lesson) =>
        lesson.title.toLowerCase().includes('сон') ||
        lesson.description.toLowerCase().includes('сн') ||
        lesson.title.toLowerCase().includes('sleep') ||
        lesson.description.toLowerCase().includes('sleep') ||
        lesson.weekProgram.title.toLowerCase().includes('сон') ||
        lesson.weekProgram.title.toLowerCase().includes('sleep')
    );
    const scopedLessons = sleepLessons.length ? sleepLessons : upcomingLessons.slice(0, 2);

    const lessonText = scopedLessons.length
      ? scopedLessons
          .map((lesson) => `- ${lesson.title} (${toDateLabel(lesson.date)}, ${lesson.durationMin} min)`)
          .join('\n')
      : '- No upcoming lessons in the calendar yet.';

    const coachingAngle = pickVariant(seed, [
      'Sleep reset: consistency first, intensity second.',
      'Sleep support: reduce evening stimulation and keep a stable wind-down window.',
      'Practical sleep focus: regular lesson timing plus short pre-sleep breathing.'
    ]);

    return {
      subagent: AISubagent.PATIENT_COACH,
      answer: [
        intro,
        repeatHint,
        followUpHint,
        contextHint,
        coachingAngle,
        'Plan for next days:',
        lessonText,
        `Doctor: ${assignedDoctor?.doctor.fullName ?? 'not assigned'}${assignedDoctor?.doctor.specialty ? ` (${assignedDoctor.doctor.specialty})` : ''}.`,
        `Pending reminders: ${pendingReminders}.`
      ]
        .filter(Boolean)
        .join('\n\n'),
      actionType: 'PATIENT_SLEEP_PLAN',
      actionPayload: {
        lessonsSuggested: scopedLessons.length,
        pendingReminders,
        repeatedQuestion: historyInsights.repeatedQuestion
      }
    };
  }

  if (intent === 'schedule') {
    const lessonText = upcomingLessons.length
      ? upcomingLessons
          .map(
            (lesson) =>
              `- Week ${lesson.weekProgram.weekNumber}: ${lesson.title} on ${toDateLabel(lesson.date)} (${lesson.durationMin} min)`
          )
          .join('\n')
      : '- No upcoming lessons found.';

    const schedulingHint = pickVariant(seed, [
      'Use fixed time slots to reduce missed sessions.',
      'Plan lessons around your highest-energy hours.',
      'Keep at least one buffer day between long sessions.'
    ]);

    return {
      subagent: AISubagent.PATIENT_COACH,
      answer: [intro, repeatHint, followUpHint, contextHint, 'Upcoming lessons:', lessonText, `Tip: ${schedulingHint}`]
        .filter(Boolean)
        .join('\n\n'),
      actionType: 'PATIENT_SCHEDULE_VIEW',
      actionPayload: {
        upcomingLessons: upcomingLessons.length,
        pendingReminders
      }
    };
  }

  if (intent === 'anxiety') {
    const groundingPlan = pickVariant(seed, [
      'Try a 4-6 breathing cycle for 5 minutes, then note anxiety level from 0 to 10.',
      'Do a short body scan (2-3 minutes), then proceed with one lesson from your week plan.',
      'Use paced breathing (inhale 4, exhale 6) and postpone high-stimulation tasks for 20 minutes.'
    ]);

    const nextLesson = upcomingLessons[0]
      ? `${upcomingLessons[0].title} on ${toDateLabel(upcomingLessons[0].date)}`
      : 'no lesson scheduled yet';

    return {
      subagent: AISubagent.PATIENT_COACH,
      answer: [
        intro,
        repeatHint,
        followUpHint,
        contextHint,
        `Immediate step: ${groundingPlan}`,
        `Next planned lesson: ${nextLesson}.`,
        'If symptoms sharply worsen, contact your doctor directly.'
      ]
        .filter(Boolean)
        .join('\n\n'),
      actionType: 'PATIENT_ANXIETY_SUPPORT',
      actionPayload: {
        nextLesson,
        pendingReminders
      }
    };
  }

  const defaultLessons = upcomingLessons.length
    ? upcomingLessons.map((lesson) => `${lesson.title} (${toDateLabel(lesson.date)})`).join(', ')
    : 'none yet';
  const genericAngle = pickVariant(seed, [
    'Steady pace beats occasional intensive sessions.',
    'Track small wins after each lesson to make progress visible.',
    'Use one short daily routine plus scheduled lessons for stability.'
  ]);

  return {
    subagent: AISubagent.PATIENT_COACH,
    answer: [
      intro,
      repeatHint,
      followUpHint,
      contextHint,
      'Action plan for this week:',
      `1. Complete next lessons: ${defaultLessons}.`,
      '2. Keep breathing routine 5-10 min daily.',
      '3. Share progress in doctor chat after each session.',
      `Focus note: ${genericAngle}`
    ]
      .filter(Boolean)
      .join('\n\n'),
    actionType: 'PATIENT_WEEKLY_PLAN',
    actionPayload: {
      upcomingLessons: upcomingLessons.length,
      pendingReminders,
      repeatedQuestion: historyInsights.repeatedQuestion
    }
  };
}

async function doctorAssistant(
  prisma: PrismaClient,
  user: User,
  message: string,
  context: AgentContext
): Promise<AgentReply> {
  const links = await prisma.doctorPatientLink.findMany({
    where: {
      doctorId: user.id
    },
    include: {
      patient: {
        select: {
          id: true,
          fullName: true,
          about: true
        }
      }
    }
  });

  const patientIds = links.map((link) => link.patientId);
  const recentMessages = patientIds.length
    ? await prisma.chatMessage.findMany({
        where: {
          fromId: {
            in: patientIds
          },
          toId: user.id
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 30
      })
    : [];

  const activeReferralCodes = await prisma.referralCode.count({
    where: {
      doctorId: user.id,
      active: true
    }
  });

  const intro = buildSafeIntro(AISubagent.DOCTOR_ASSISTANT);
  const intent = detectIntent(AISubagent.DOCTOR_ASSISTANT, message);
  const historyInsights = getHistoryInsights(message, context.history);
  const seed = `${message}|${historyInsights.totalMessages}|${intent}`;
  const contextHint = continuityLine(historyInsights.previousUserMessage);
  const repeatHint = historyInsights.repeatedQuestion
    ? 'This looks like a repeated request, so I am adding a different operational view.'
    : '';

  if (intent === 'summary') {
    const lastByPatient = new Map<string, Date>();
    recentMessages.forEach((item) => {
      if (!lastByPatient.has(item.fromId)) {
        lastByPatient.set(item.fromId, item.createdAt);
      }
    });

    const lines = links.map((link) => {
      const last = lastByPatient.get(link.patientId);
      return `- ${link.patient.fullName}: ${last ? last.toISOString() : 'no recent messages'}`;
    });

    const summaryAngle = pickVariant(seed, [
      'Prioritize patients with no message in the last 7 days.',
      'Start with high-anxiety profiles and short weekly check-ins.',
      'Use a two-pass review: inactive patients first, then follow-up responses.'
    ]);

    return {
      subagent: AISubagent.DOCTOR_ASSISTANT,
      answer: [
        intro,
        repeatHint,
        contextHint,
        'Patient communication summary:',
        lines.join('\n') || '- no linked patients',
        `Active referral codes: ${activeReferralCodes}.`,
        `Suggested triage: ${summaryAngle}`
      ]
        .filter(Boolean)
        .join('\n\n'),
      actionType: 'DOCTOR_PATIENT_SUMMARY',
      actionPayload: {
        patients: links.length,
        recentInboundMessages: recentMessages.length,
        repeatedQuestion: historyInsights.repeatedQuestion
      }
    };
  }

  if (intent === 'referral') {
    const referralHint = pickVariant(seed, [
      'Keep 1-2 active codes to reduce uncontrolled registrations.',
      'Rotate codes monthly and disable unused ones.',
      'Share one code per patient intake case to simplify tracking.'
    ]);

    return {
      subagent: AISubagent.DOCTOR_ASSISTANT,
      answer: [
        intro,
        repeatHint,
        contextHint,
        'Referral workflow:',
        '1. Create new code in "Codes" screen.',
        '2. Send the code to patient.',
        '3. After registration, patient is auto-linked to your account.',
        `Current active codes: ${activeReferralCodes}.`,
        `Ops note: ${referralHint}`
      ]
        .filter(Boolean)
        .join('\n\n'),
      actionType: 'DOCTOR_REFERRAL_GUIDE',
      actionPayload: {
        activeReferralCodes
      }
    };
  }

  const operationalAngle = pickVariant(seed, [
    'Send check-ins to patients without inbound messages this week.',
    'Review latest incoming messages and classify by urgency.',
    'Combine lesson adherence reminders with brief symptom prompts.'
  ]);

  return {
    subagent: AISubagent.DOCTOR_ASSISTANT,
    answer: [
      intro,
      repeatHint,
      contextHint,
      'Operational snapshot:',
      `- Linked patients: ${links.length}`,
      `- Recent inbound patient messages (last batch): ${recentMessages.length}`,
      `- Active referral codes: ${activeReferralCodes}`,
      `Suggested next step: ${operationalAngle}`
    ]
      .filter(Boolean)
      .join('\n\n'),
    actionType: 'DOCTOR_OPERATIONS_SNAPSHOT',
    actionPayload: {
      linkedPatients: links.length,
      recentInboundMessages: recentMessages.length,
      activeReferralCodes
    }
  };
}

async function adminAssistant(
  prisma: PrismaClient,
  message: string,
  context: AgentContext
): Promise<AgentReply> {
  const [patients, doctors, admins, weeks, lessons, activeReferrals, pendingReminders, orphanPatients] =
    await Promise.all([
      prisma.user.count({ where: { role: Role.PATIENT } }),
      prisma.user.count({ where: { role: Role.DOCTOR } }),
      prisma.user.count({ where: { role: Role.ADMIN } }),
      prisma.weekProgram.count(),
      prisma.lesson.count(),
      prisma.referralCode.count({ where: { active: true } }),
      prisma.lessonReminder.count({ where: { status: 'PENDING' } }),
      prisma.user.count({
        where: {
          role: Role.PATIENT,
          patientLink: {
            is: null
          }
        }
      })
    ]);

  const intro = buildSafeIntro(AISubagent.ADMIN_ASSISTANT);
  const intent = detectIntent(AISubagent.ADMIN_ASSISTANT, message);
  const historyInsights = getHistoryInsights(message, context.history);
  const seed = `${message}|${historyInsights.totalMessages}|${intent}`;
  const contextHint = continuityLine(historyInsights.previousUserMessage);

  if (intent === 'risk') {
    const riskAngle = pickVariant(seed, [
      'Set alert threshold: orphan patients > 0 and reminder queue growth day-over-day.',
      'Track orphan patients and reminder backlog as daily health indicators.',
      'Use referral-code cleanup plus reminder queue monitoring as weekly admin routine.'
    ]);

    return {
      subagent: AISubagent.ADMIN_ASSISTANT,
      answer: [
        intro,
        contextHint,
        'Risk checklist:',
        `- Patients without doctor link: ${orphanPatients}`,
        `- Pending reminders queue: ${pendingReminders}`,
        `- Active referral codes: ${activeReferrals}`,
        `Recommendation: ${riskAngle}`
      ]
        .filter(Boolean)
        .join('\n\n'),
      actionType: 'ADMIN_RISK_REPORT',
      actionPayload: {
        orphanPatients,
        pendingReminders,
        activeReferrals,
        repeatedQuestion: historyInsights.repeatedQuestion
      }
    };
  }

  const snapshotAngle = pickVariant(seed, [
    'Focus first on data integrity, then user growth.',
    'Check orphan links and reminder backlog before content expansion.',
    'Keep referral inventory and lesson coverage balanced each week.'
  ]);

  return {
    subagent: AISubagent.ADMIN_ASSISTANT,
    answer: [
      intro,
      contextHint,
      'System snapshot:',
      `- Users: ${patients + doctors + admins} (patients ${patients}, doctors ${doctors}, admins ${admins})`,
      `- Weekly programs: ${weeks}`,
      `- Lessons: ${lessons}`,
      `- Active referral codes: ${activeReferrals}`,
      `- Pending reminders: ${pendingReminders}`,
      `Admin note: ${snapshotAngle}`
    ]
      .filter(Boolean)
      .join('\n\n'),
    actionType: 'ADMIN_SYSTEM_SNAPSHOT',
    actionPayload: {
      users: patients + doctors + admins,
      patients,
      doctors,
      admins,
      weeks,
      lessons,
      activeReferrals,
      pendingReminders
    }
  };
}

export async function generateAgentReply(
  prisma: PrismaClient,
  user: User,
  message: string,
  context: AgentContext = {}
): Promise<AgentReply> {
  const subagent = pickSubagent(user.role);

  if (subagent === AISubagent.PATIENT_COACH) {
    return patientCoach(prisma, user, message, context);
  }

  if (subagent === AISubagent.DOCTOR_ASSISTANT) {
    return doctorAssistant(prisma, user, message, context);
  }

  return adminAssistant(prisma, message, context);
}

export function getSessionTitle(firstMessage: string): string {
  return firstMessage.trim().slice(0, 80) || 'AI Session';
}

export function serializeAiMessage(item: { id: string; role: AIMessageRole; content: string; createdAt: Date }) {
  return {
    id: item.id,
    role: item.role.toLowerCase(),
    content: item.content,
    createdAt: item.createdAt.toISOString()
  };
}
