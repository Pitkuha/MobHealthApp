import { PrismaClient, Role } from '@prisma/client';
import { hashPassword } from '../src/utils/password';

const prisma = new PrismaClient();

async function main() {
  await prisma.lessonReminder.deleteMany();
  await prisma.pushToken.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.referralCode.deleteMany();
  await prisma.doctorPatientLink.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.weekProgram.deleteMany();
  await prisma.user.deleteMany();

  const patientPassword = await hashPassword('patient123');
  const doctorPassword = await hashPassword('doctor123');
  const adminPassword = await hashPassword('admin123');

  const patient1 = await prisma.user.create({
    data: {
      role: Role.PATIENT,
      fullName: 'Анна Мельникова',
      email: 'anna@example.com',
      passwordHash: patientPassword,
      age: 32,
      about: 'Хочу снизить тревожность и улучшить сон.'
    }
  });

  const patient2 = await prisma.user.create({
    data: {
      role: Role.PATIENT,
      fullName: 'Игорь Смирнов',
      email: 'igor@example.com',
      passwordHash: patientPassword,
      age: 41,
      about: 'Работаю с выгоранием и восстановлением фокуса.'
    }
  });

  const doctor = await prisma.user.create({
    data: {
      role: Role.DOCTOR,
      fullName: 'Д-р Елена Орлова',
      email: 'e.orlova@clinic.com',
      passwordHash: doctorPassword,
      specialty: 'Психотерапевт',
      about: 'Практика 12 лет. Специализация: тревожные расстройства.'
    }
  });

  await prisma.user.create({
    data: {
      role: Role.ADMIN,
      fullName: 'Администратор Системы',
      email: 'admin@mobhealth.app',
      passwordHash: adminPassword,
      about: 'Управление контентом и пользователями.'
    }
  });

  await prisma.doctorPatientLink.createMany({
    data: [
      { doctorId: doctor.id, patientId: patient1.id },
      { doctorId: doctor.id, patientId: patient2.id }
    ]
  });

  await prisma.referralCode.create({
    data: {
      code: 'DRORLOVA10',
      doctorId: doctor.id,
      active: true
    }
  });

  const week1 = await prisma.weekProgram.create({
    data: {
      weekNumber: 1,
      title: 'Неделя 1: Базовое расслабление'
    }
  });

  const week2 = await prisma.weekProgram.create({
    data: {
      weekNumber: 2,
      title: 'Неделя 2: Работа с эмоциями'
    }
  });

  const week3 = await prisma.weekProgram.create({
    data: {
      weekNumber: 3,
      title: 'Неделя 3: Сон и восстановление'
    }
  });

  const sampleAudio = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';

  await prisma.lesson.createMany({
    data: [
      {
        weekProgramId: week1.id,
        title: 'Дыхательная стабилизация',
        description: 'Короткая практика на 7 минут для снятия мышечного напряжения.',
        date: new Date('2026-02-23T09:00:00.000Z'),
        audioUrl: sampleAudio,
        durationMin: 7
      },
      {
        weekProgramId: week1.id,
        title: 'Тяжесть в руках и ногах',
        description: 'Классическая аутогенная тренировка для вечернего восстановления.',
        date: new Date('2026-02-25T09:00:00.000Z'),
        audioUrl: sampleAudio,
        durationMin: 10
      },
      {
        weekProgramId: week2.id,
        title: 'Тепло в теле',
        description: 'Практика осознанного расслабления через телесные ощущения.',
        date: new Date('2026-03-02T09:00:00.000Z'),
        audioUrl: sampleAudio,
        durationMin: 11
      },
      {
        weekProgramId: week2.id,
        title: 'Безопасное место',
        description: 'Визуализация для снижения фоновой тревоги в течение дня.',
        date: new Date('2026-03-04T09:00:00.000Z'),
        audioUrl: sampleAudio,
        durationMin: 9
      },
      {
        weekProgramId: week3.id,
        title: 'Спокойный вечер',
        description: 'Подготовка к сну и мягкое замедление мыслей.',
        date: new Date('2026-03-09T09:00:00.000Z'),
        audioUrl: sampleAudio,
        durationMin: 12
      },
      {
        weekProgramId: week3.id,
        title: 'Утренний ресурс',
        description: 'Быстрый запуск дня с фокусом на дыхание и внимание.',
        date: new Date('2026-03-11T09:00:00.000Z'),
        audioUrl: sampleAudio,
        durationMin: 6
      }
    ]
  });

  await prisma.chatMessage.createMany({
    data: [
      {
        fromId: patient1.id,
        toId: doctor.id,
        text: 'Здравствуйте! После вчерашнего урока стало легче засыпать.',
        createdAt: new Date('2026-02-20T18:10:00.000Z')
      },
      {
        fromId: doctor.id,
        toId: patient1.id,
        text: 'Отлично. Продолжайте 3 раза в неделю и фиксируйте самочувствие.',
        createdAt: new Date('2026-02-20T18:15:00.000Z')
      }
    ]
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
