package com.mobhealth.backendjava.service;

import com.mobhealth.backendjava.model.Role;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.UUID;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements ApplicationRunner {
  private final NamedParameterJdbcTemplate jdbc;
  private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

  public DataSeeder(NamedParameterJdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  @Override
  public void run(ApplicationArguments args) {
    Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM \"User\"", Map.of(), Integer.class);
    if (count != null && count > 0) {
      return;
    }

    String patientPassword = passwordEncoder.encode("patient123");
    String doctorPassword = passwordEncoder.encode("doctor123");
    String adminPassword = passwordEncoder.encode("admin123");

    Timestamp now = Timestamp.from(Instant.now());

    String patient1 = createUser(Role.PATIENT, "Анна Мельникова", "anna@example.com", patientPassword, 32, null,
        "Хочу снизить тревожность и улучшить сон.", now);
    String patient2 = createUser(Role.PATIENT, "Игорь Смирнов", "igor@example.com", patientPassword, 41, null,
        "Работаю с выгоранием и восстановлением фокуса.", now);
    String doctor = createUser(Role.DOCTOR, "Д-р Елена Орлова", "e.orlova@clinic.com", doctorPassword, null,
        "Психотерапевт", "Практика 12 лет. Специализация: тревожные расстройства.", now);
    createUser(Role.ADMIN, "Администратор Системы", "admin@mobhealth.app", adminPassword, null,
        null, "Управление контентом и пользователями.", now);

    jdbc.update("""
        INSERT INTO "DoctorPatientLink" ("id", "doctorId", "patientId", "createdAt")
        VALUES (:id, :doctorId, :patientId, :createdAt)
        """, new MapSqlParameterSource()
        .addValue("id", UUID.randomUUID().toString())
        .addValue("doctorId", doctor)
        .addValue("patientId", patient1)
        .addValue("createdAt", now));

    jdbc.update("""
        INSERT INTO "DoctorPatientLink" ("id", "doctorId", "patientId", "createdAt")
        VALUES (:id, :doctorId, :patientId, :createdAt)
        """, new MapSqlParameterSource()
        .addValue("id", UUID.randomUUID().toString())
        .addValue("doctorId", doctor)
        .addValue("patientId", patient2)
        .addValue("createdAt", now));

    jdbc.update("""
        INSERT INTO "ReferralCode" ("id", "code", "doctorId", "active", "createdAt")
        VALUES (:id, :code, :doctorId, true, :createdAt)
        """, new MapSqlParameterSource()
        .addValue("id", UUID.randomUUID().toString())
        .addValue("code", "DRORLOVA10")
        .addValue("doctorId", doctor)
        .addValue("createdAt", now));

    String week1 = createWeek(1, "Неделя 1: Базовое расслабление", now);
    String week2 = createWeek(2, "Неделя 2: Работа с эмоциями", now);
    String week3 = createWeek(3, "Неделя 3: Сон и восстановление", now);

    String sampleAudio = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

    createLesson(week1, "Дыхательная стабилизация", "Короткая практика на 7 минут для снятия мышечного напряжения.",
        LocalDate.of(2026, 2, 23), sampleAudio, 7, now);
    createLesson(week1, "Тяжесть в руках и ногах", "Классическая аутогенная тренировка для вечернего восстановления.",
        LocalDate.of(2026, 2, 25), sampleAudio, 10, now);
    createLesson(week2, "Тепло в теле", "Практика осознанного расслабления через телесные ощущения.",
        LocalDate.of(2026, 3, 2), sampleAudio, 11, now);
    createLesson(week2, "Безопасное место", "Визуализация для снижения фоновой тревоги в течение дня.",
        LocalDate.of(2026, 3, 4), sampleAudio, 9, now);
    createLesson(week3, "Спокойный вечер", "Подготовка к сну и мягкое замедление мыслей.",
        LocalDate.of(2026, 3, 9), sampleAudio, 12, now);
    createLesson(week3, "Утренний ресурс", "Быстрый запуск дня с фокусом на дыхание и внимание.",
        LocalDate.of(2026, 3, 11), sampleAudio, 6, now);

    jdbc.update("""
        INSERT INTO "ChatMessage" ("id", "fromId", "toId", "text", "createdAt")
        VALUES (:id, :fromId, :toId, :text, :createdAt)
        """, new MapSqlParameterSource()
        .addValue("id", UUID.randomUUID().toString())
        .addValue("fromId", patient1)
        .addValue("toId", doctor)
        .addValue("text", "Здравствуйте! После вчерашнего урока стало легче засыпать.")
        .addValue("createdAt", Timestamp.from(Instant.parse("2026-02-20T18:10:00Z"))));

    jdbc.update("""
        INSERT INTO "ChatMessage" ("id", "fromId", "toId", "text", "createdAt")
        VALUES (:id, :fromId, :toId, :text, :createdAt)
        """, new MapSqlParameterSource()
        .addValue("id", UUID.randomUUID().toString())
        .addValue("fromId", doctor)
        .addValue("toId", patient1)
        .addValue("text", "Отлично. Продолжайте 3 раза в неделю и фиксируйте самочувствие.")
        .addValue("createdAt", Timestamp.from(Instant.parse("2026-02-20T18:15:00Z"))));
  }

  private String createUser(Role role, String fullName, String email, String passwordHash, Integer age,
                            String specialty, String about, Timestamp now) {
    String id = UUID.randomUUID().toString();
    jdbc.update("""
        INSERT INTO "User" ("id", "role", "fullName", "email", "passwordHash", "age", "specialty", "about", "createdAt", "updatedAt")
        VALUES (:id, CAST(:role AS "Role"), :fullName, :email, :passwordHash, :age, :specialty, :about, :createdAt, :updatedAt)
        """, new MapSqlParameterSource()
        .addValue("id", id)
        .addValue("role", role.name())
        .addValue("fullName", fullName)
        .addValue("email", email)
        .addValue("passwordHash", passwordHash)
        .addValue("age", age)
        .addValue("specialty", specialty)
        .addValue("about", about)
        .addValue("createdAt", now)
        .addValue("updatedAt", now));
    return id;
  }

  private String createWeek(int weekNumber, String title, Timestamp now) {
    String id = UUID.randomUUID().toString();
    jdbc.update("""
        INSERT INTO "WeekProgram" ("id", "weekNumber", "title", "createdAt", "updatedAt")
        VALUES (:id, :weekNumber, :title, :createdAt, :updatedAt)
        """, new MapSqlParameterSource()
        .addValue("id", id)
        .addValue("weekNumber", weekNumber)
        .addValue("title", title)
        .addValue("createdAt", now)
        .addValue("updatedAt", now));
    return id;
  }

  private void createLesson(String weekId, String title, String description, LocalDate date,
                            String audioUrl, int durationMin, Timestamp now) {
    jdbc.update("""
        INSERT INTO "Lesson" ("id", "weekProgramId", "title", "description", "date", "audioUrl", "durationMin", "createdAt", "updatedAt")
        VALUES (:id, :weekProgramId, :title, :description, :date, :audioUrl, :durationMin, :createdAt, :updatedAt)
        """, new MapSqlParameterSource()
        .addValue("id", UUID.randomUUID().toString())
        .addValue("weekProgramId", weekId)
        .addValue("title", title)
        .addValue("description", description)
        .addValue("date", Timestamp.from(date.atStartOfDay().toInstant(ZoneOffset.UTC)))
        .addValue("audioUrl", audioUrl)
        .addValue("durationMin", durationMin)
        .addValue("createdAt", now)
        .addValue("updatedAt", now));
  }
}
