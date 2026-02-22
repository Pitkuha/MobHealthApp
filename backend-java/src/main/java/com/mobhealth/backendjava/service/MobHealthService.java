package com.mobhealth.backendjava.service;

import com.mobhealth.backendjava.config.ApiException;
import com.mobhealth.backendjava.model.AIMessageRole;
import com.mobhealth.backendjava.model.AISubagent;
import com.mobhealth.backendjava.model.ReminderStatus;
import com.mobhealth.backendjava.model.Role;
import com.mobhealth.backendjava.security.AuthUser;
import com.mobhealth.backendjava.security.JwtService;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MobHealthService {
  private final NamedParameterJdbcTemplate jdbc;
  private final JwtService jwtService;
  private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

  private static final RowMapper<DbUser> USER_MAPPER = (rs, rowNum) -> new DbUser(
      rs.getString("id"),
      rs.getString("role"),
      rs.getString("fullName"),
      rs.getString("email"),
      rs.getString("passwordHash"),
      (Integer) rs.getObject("age"),
      rs.getString("specialty"),
      rs.getString("about")
  );

  public MobHealthService(NamedParameterJdbcTemplate jdbc, JwtService jwtService) {
    this.jdbc = jdbc;
    this.jwtService = jwtService;
  }

  public Optional<AuthUser> findAuthUserById(String id) {
    return findUserById(id).map(user -> new AuthUser(user.id(), Role.fromDb(user.role()), user.email()));
  }

  public Map<String, Object> login(String email, String password) {
    DbUser user = findUserByEmail(email.toLowerCase(Locale.ROOT))
        .orElseThrow(() -> new ApiException(401, "Неверный email или пароль"));

    if (!passwordEncoder.matches(password, user.passwordHash())) {
      throw new ApiException(401, "Неверный email или пароль");
    }

    String token = jwtService.sign(new AuthUser(user.id(), Role.fromDb(user.role()), user.email()));
    return Map.of(
        "token", token,
        "user", serializeUser(user)
    );
  }

  @Transactional
  public Map<String, Object> registerPatient(String fullName, String email, String password, String referralCode, Integer age) {
    if (findUserByEmail(email.toLowerCase(Locale.ROOT)).isPresent()) {
      throw new ApiException(409, "Пользователь с таким email уже существует");
    }

    Map<String, Object> referral = findReferralByCode(referralCode.toUpperCase(Locale.ROOT))
        .orElseThrow(() -> new ApiException(400, "Реферальный код не найден или недействителен"));

    String doctorId = (String) referral.get("doctorId");
    DbUser doctor = findUserById(doctorId)
        .orElseThrow(() -> new ApiException(400, "Реферальный код не найден или недействителен"));
    if (Role.fromDb(doctor.role()) != Role.DOCTOR) {
      throw new ApiException(400, "Реферальный код не найден или недействителен");
    }

    String now = nowIso();
    String userId = uuid();
    String passwordHash = passwordEncoder.encode(password);

    String insertUser = """
        INSERT INTO "User" ("id", "role", "fullName", "email", "passwordHash", "age", "about", "createdAt", "updatedAt")
        VALUES (:id, CAST(:role AS "Role"), :fullName, :email, :passwordHash, :age, :about, :createdAt, :updatedAt)
        """;
    jdbc.update(insertUser, new MapSqlParameterSource()
        .addValue("id", userId)
        .addValue("role", Role.PATIENT.name())
        .addValue("fullName", fullName)
        .addValue("email", email.toLowerCase(Locale.ROOT))
        .addValue("passwordHash", passwordHash)
        .addValue("age", age)
        .addValue("about", "Новый пациент, зарегистрированный по коду врача.")
        .addValue("createdAt", Timestamp.from(Instant.parse(now)))
        .addValue("updatedAt", Timestamp.from(Instant.parse(now))));

    String linkId = uuid();
    jdbc.update("""
        INSERT INTO "DoctorPatientLink" ("id", "doctorId", "patientId", "createdAt")
        VALUES (:id, :doctorId, :patientId, :createdAt)
        """, new MapSqlParameterSource()
        .addValue("id", linkId)
        .addValue("doctorId", doctorId)
        .addValue("patientId", userId)
        .addValue("createdAt", Timestamp.from(Instant.parse(now))));

    jdbc.update("""
        UPDATE "ReferralCode"
        SET "active" = false, "usedByPatientId" = :patientId
        WHERE "id" = :id
        """, Map.of("patientId", userId, "id", referral.get("id")));

    DbUser created = findUserById(userId).orElseThrow(() -> new ApiException(500, "Failed to create user"));
    String token = jwtService.sign(new AuthUser(created.id(), Role.fromDb(created.role()), created.email()));

    return Map.of("token", token, "user", serializeUser(created));
  }

  public Map<String, Object> me(AuthUser authUser) {
    DbUser user = findUserById(authUser.id()).orElseThrow(() -> new ApiException(401, "Unauthorized"));
    return Map.of("user", serializeUser(user));
  }

  public Map<String, Object> bootstrap(AuthUser authUser) {
    DbUser currentUser = findUserById(authUser.id()).orElseThrow(() -> new ApiException(401, "Unauthorized"));

    List<Map<String, Object>> weeks = getWeeksInternal();
    List<Map<String, Object>> users = new ArrayList<>();
    List<Map<String, Object>> messages = new ArrayList<>();
    List<Map<String, Object>> links = new ArrayList<>();
    List<Map<String, Object>> referralCodes = new ArrayList<>();

    if (authUser.role() == Role.PATIENT) {
      users.add(serializeUser(currentUser));
      List<Map<String, Object>> linkRows = jdbc.queryForList("""
          SELECT "doctorId", "patientId" FROM "DoctorPatientLink"
          WHERE "patientId" = :patientId
          """, Map.of("patientId", authUser.id()));
      links.addAll(linkRows.stream().map(this::serializeLink).toList());

      List<String> doctorIds = linkRows.stream().map(row -> (String) row.get("doctorId")).toList();
      if (!doctorIds.isEmpty()) {
        List<DbUser> doctors = jdbc.query("""
            SELECT "id", "role", "fullName", "email", "passwordHash", "age", "specialty", "about"
            FROM "User" WHERE "id" IN (:ids)
            """, Map.of("ids", doctorIds), USER_MAPPER);
        users.addAll(doctors.stream().map(this::serializeUser).toList());
      }

      List<Map<String, Object>> messageRows = jdbc.queryForList("""
          SELECT "id", "fromId", "toId", "text", "createdAt"
          FROM "ChatMessage"
          WHERE "fromId" = :id OR "toId" = :id
          ORDER BY "createdAt" ASC
          """, Map.of("id", authUser.id()));
      messages.addAll(messageRows.stream().map(this::serializeMessage).toList());
    } else if (authUser.role() == Role.DOCTOR) {
      users.add(serializeUser(currentUser));
      List<Map<String, Object>> linkRows = jdbc.queryForList("""
          SELECT "doctorId", "patientId" FROM "DoctorPatientLink"
          WHERE "doctorId" = :doctorId
          """, Map.of("doctorId", authUser.id()));
      links.addAll(linkRows.stream().map(this::serializeLink).toList());

      List<String> patientIds = linkRows.stream().map(row -> (String) row.get("patientId")).toList();
      if (!patientIds.isEmpty()) {
        List<DbUser> patients = jdbc.query("""
            SELECT "id", "role", "fullName", "email", "passwordHash", "age", "specialty", "about"
            FROM "User" WHERE "id" IN (:ids)
            """, Map.of("ids", patientIds), USER_MAPPER);
        users.addAll(patients.stream().map(this::serializeUser).toList());
      }

      List<Map<String, Object>> messageRows = jdbc.queryForList("""
          SELECT "id", "fromId", "toId", "text", "createdAt"
          FROM "ChatMessage"
          WHERE "fromId" = :id OR "toId" = :id
          ORDER BY "createdAt" ASC
          """, Map.of("id", authUser.id()));
      messages.addAll(messageRows.stream().map(this::serializeMessage).toList());

      List<Map<String, Object>> referralRows = jdbc.queryForList("""
          SELECT "id", "code", "doctorId", "active", "usedByPatientId", "createdAt"
          FROM "ReferralCode" WHERE "doctorId" = :doctorId ORDER BY "createdAt" DESC
          """, Map.of("doctorId", authUser.id()));
      referralCodes.addAll(referralRows.stream().map(this::serializeReferral).toList());
    } else {
      List<DbUser> allUsers = jdbc.query("""
          SELECT "id", "role", "fullName", "email", "passwordHash", "age", "specialty", "about"
          FROM "User" ORDER BY "createdAt" ASC
          """, Map.of(), USER_MAPPER);
      users.addAll(allUsers.stream().map(this::serializeUser).toList());

      List<Map<String, Object>> messageRows = jdbc.queryForList("""
          SELECT "id", "fromId", "toId", "text", "createdAt"
          FROM "ChatMessage"
          ORDER BY "createdAt" ASC
          """, Map.of());
      messages.addAll(messageRows.stream().map(this::serializeMessage).toList());

      List<Map<String, Object>> linkRows = jdbc.queryForList("""
          SELECT "doctorId", "patientId" FROM "DoctorPatientLink" ORDER BY "createdAt" ASC
          """, Map.of());
      links.addAll(linkRows.stream().map(this::serializeLink).toList());

      List<Map<String, Object>> referralRows = jdbc.queryForList("""
          SELECT "id", "code", "doctorId", "active", "usedByPatientId", "createdAt"
          FROM "ReferralCode" ORDER BY "createdAt" DESC
          """, Map.of());
      referralCodes.addAll(referralRows.stream().map(this::serializeReferral).toList());
    }

    Map<String, Object> out = new LinkedHashMap<>();
    out.put("currentUser", serializeUser(currentUser));
    out.put("users", users);
    out.put("weeks", weeks);
    out.put("messages", messages);
    out.put("links", links);
    out.put("referralCodes", referralCodes);
    return out;
  }

  public Map<String, Object> updateOwnUser(AuthUser authUser, UserPatch patch) {
    return Map.of("user", updateUserInternal(authUser.id(), patch));
  }

  public Map<String, Object> updateUserByAdmin(AuthUser authUser, String userId, UserPatch patch) {
    requireRole(authUser, Role.ADMIN);
    return Map.of("user", updateUserInternal(userId, patch));
  }

  public Map<String, Object> listUsers(AuthUser authUser) {
    requireRole(authUser, Role.ADMIN);
    List<DbUser> users = jdbc.query("""
        SELECT "id", "role", "fullName", "email", "passwordHash", "age", "specialty", "about"
        FROM "User" ORDER BY "createdAt" ASC
        """, Map.of(), USER_MAPPER);
    return Map.of("users", users.stream().map(this::serializeUser).toList());
  }

  public Map<String, Object> listWeeks(AuthUser authUser) {
    requireAuthenticated(authUser);
    return Map.of("weeks", getWeeksInternal());
  }

  public Map<String, Object> updateLessonByAdmin(AuthUser authUser, String lessonId, LessonPatch patch) {
    requireRole(authUser, Role.ADMIN);

    Map<String, Object> lessonRow = getLessonById(lessonId)
        .orElseThrow(() -> new ApiException(404, "Урок не найден"));

    String title = patch.title() != null ? patch.title() : (String) lessonRow.get("title");
    String description = patch.description() != null ? patch.description() : (String) lessonRow.get("description");
    Integer durationMin = patch.durationMin() != null ? patch.durationMin() : (Integer) lessonRow.get("durationMin");
    String audioUrl = patch.audioUrl() != null ? patch.audioUrl() : (String) lessonRow.get("audioUrl");

    Timestamp dateValue;
    if (patch.date() != null && !patch.date().isBlank()) {
      try {
        LocalDate parsed = LocalDate.parse(patch.date());
        dateValue = Timestamp.from(parsed.atStartOfDay().toInstant(ZoneOffset.UTC));
      } catch (Exception ex) {
        throw new ApiException(400, "Некорректная дата, ожидается YYYY-MM-DD");
      }
    } else {
      dateValue = (Timestamp) lessonRow.get("date");
    }

    String now = nowIso();
    jdbc.update("""
        UPDATE "Lesson"
        SET "title" = :title,
            "description" = :description,
            "date" = :date,
            "durationMin" = :durationMin,
            "audioUrl" = :audioUrl,
            "updatedAt" = :updatedAt
        WHERE "id" = :id
        """, new MapSqlParameterSource()
        .addValue("title", title)
        .addValue("description", description)
        .addValue("date", dateValue)
        .addValue("durationMin", durationMin)
        .addValue("audioUrl", audioUrl)
        .addValue("updatedAt", Timestamp.from(Instant.parse(now)))
        .addValue("id", lessonId));

    Map<String, Object> updated = jdbc.queryForMap("""
        SELECT l."id", l."title", l."description", l."date", l."audioUrl", l."durationMin", w."weekNumber"
        FROM "Lesson" l
        JOIN "WeekProgram" w ON w."id" = l."weekProgramId"
        WHERE l."id" = :id
        """, Map.of("id", lessonId));

    return Map.of("lesson", serializeLessonWithWeek(updated));
  }

  public Map<String, Object> sendMessage(AuthUser authUser, String toId, String text) {
    requireRoleNot(authUser, Role.ADMIN, "Администратор не может отправлять сообщения");

    if (!canMessage(authUser.id(), toId)) {
      throw new ApiException(403, "Нет доступа к этому диалогу");
    }

    String messageId = uuid();
    Timestamp now = Timestamp.from(Instant.now());
    jdbc.update("""
        INSERT INTO "ChatMessage" ("id", "fromId", "toId", "text", "createdAt")
        VALUES (:id, :fromId, :toId, :text, :createdAt)
        """, new MapSqlParameterSource()
        .addValue("id", messageId)
        .addValue("fromId", authUser.id())
        .addValue("toId", toId)
        .addValue("text", text.trim())
        .addValue("createdAt", now));

    Map<String, Object> created = jdbc.queryForMap("""
        SELECT "id", "fromId", "toId", "text", "createdAt"
        FROM "ChatMessage" WHERE "id" = :id
        """, Map.of("id", messageId));
    return Map.of("message", serializeMessage(created));
  }

  public Map<String, Object> listMessages(AuthUser authUser, String withUserId) {
    if (withUserId == null || withUserId.isBlank()) {
      throw new ApiException(400, "Query param withUserId is required");
    }

    if (authUser.role() != Role.ADMIN && !canMessage(authUser.id(), withUserId)) {
      throw new ApiException(403, "Нет доступа к этому диалогу");
    }

    List<Map<String, Object>> rows;
    if (authUser.role() == Role.ADMIN) {
      rows = jdbc.queryForList("""
          SELECT "id", "fromId", "toId", "text", "createdAt"
          FROM "ChatMessage"
          WHERE ("fromId" = :me AND "toId" = :withUserId)
             OR ("fromId" = :withUserId AND "toId" = :me)
          ORDER BY "createdAt" ASC
          """, Map.of("me", authUser.id(), "withUserId", withUserId));
    } else {
      rows = jdbc.queryForList("""
          SELECT "id", "fromId", "toId", "text", "createdAt"
          FROM "ChatMessage"
          WHERE ("fromId" = :me AND "toId" = :withUserId)
             OR ("fromId" = :withUserId AND "toId" = :me)
          ORDER BY "createdAt" ASC
          """, Map.of("me", authUser.id(), "withUserId", withUserId));
    }

    return Map.of("messages", rows.stream().map(this::serializeMessage).toList());
  }

  public Map<String, Object> createReferralCode(AuthUser authUser) {
    requireRole(authUser, Role.DOCTOR);

    DbUser doctor = findUserById(authUser.id()).orElseThrow(() -> new ApiException(404, "Врач не найден"));

    String code = nextReferralCode(doctor.fullName());
    String id = uuid();
    Timestamp now = Timestamp.from(Instant.now());

    jdbc.update("""
        INSERT INTO "ReferralCode" ("id", "code", "doctorId", "active", "createdAt")
        VALUES (:id, :code, :doctorId, :active, :createdAt)
        """, new MapSqlParameterSource()
        .addValue("id", id)
        .addValue("code", code)
        .addValue("doctorId", doctor.id())
        .addValue("active", true)
        .addValue("createdAt", now));

    Map<String, Object> row = jdbc.queryForMap("""
        SELECT "id", "code", "doctorId", "active", "usedByPatientId", "createdAt"
        FROM "ReferralCode" WHERE "id" = :id
        """, Map.of("id", id));

    return Map.of("referralCode", serializeReferral(row));
  }

  public Map<String, Object> toggleReferralCodeByAdmin(AuthUser authUser, String referralId, boolean active) {
    requireRole(authUser, Role.ADMIN);
    jdbc.update("""
        UPDATE "ReferralCode" SET "active" = :active WHERE "id" = :id
        """, Map.of("active", active, "id", referralId));

    List<Map<String, Object>> rows = jdbc.queryForList("""
        SELECT "id", "code", "doctorId", "active", "usedByPatientId", "createdAt"
        FROM "ReferralCode" WHERE "id" = :id
        """, Map.of("id", referralId));
    if (rows.isEmpty()) {
      throw new ApiException(404, "Некорректный referral id");
    }
    return Map.of("referralCode", serializeReferral(rows.get(0)));
  }

  public Map<String, Object> listReferralCodes(AuthUser authUser) {
    List<Map<String, Object>> rows;
    if (authUser.role() == Role.DOCTOR) {
      rows = jdbc.queryForList("""
          SELECT "id", "code", "doctorId", "active", "usedByPatientId", "createdAt"
          FROM "ReferralCode" WHERE "doctorId" = :doctorId ORDER BY "createdAt" DESC
          """, Map.of("doctorId", authUser.id()));
    } else if (authUser.role() == Role.ADMIN) {
      rows = jdbc.queryForList("""
          SELECT "id", "code", "doctorId", "active", "usedByPatientId", "createdAt"
          FROM "ReferralCode" ORDER BY "createdAt" DESC
          """, Map.of());
    } else {
      rows = List.of();
    }

    return Map.of("referralCodes", rows.stream().map(this::serializeReferral).toList());
  }

  public Map<String, Object> registerPushToken(AuthUser authUser, String token) {
    String id = uuid();
    Map<String, Object> row = jdbc.queryForMap("""
        INSERT INTO "PushToken" ("id", "userId", "token", "createdAt")
        VALUES (:id, :userId, :token, :createdAt)
        ON CONFLICT ("token") DO UPDATE SET "userId" = EXCLUDED."userId"
        RETURNING "id", "userId", "token", "createdAt"
        """, new MapSqlParameterSource()
        .addValue("id", id)
        .addValue("userId", authUser.id())
        .addValue("token", token)
        .addValue("createdAt", Timestamp.from(Instant.now())));

    return Map.of("token", Map.of("id", row.get("id")));
  }

  public Map<String, Object> createReminder(AuthUser authUser, String lessonId, int minutesBefore) {
    requireRole(authUser, Role.PATIENT);

    Map<String, Object> lesson = getLessonById(lessonId).orElseThrow(() -> new ApiException(404, "Урок не найден"));

    LocalDate lessonDate = toLocalDate(lesson.get("date"));
    LocalDateTime reminderTime = LocalDateTime.of(lessonDate, LocalTime.of(9, 0)).minusMinutes(minutesBefore);

    String reminderId = uuid();
    Timestamp remindAt = Timestamp.valueOf(reminderTime);

    jdbc.update("""
        INSERT INTO "LessonReminder" ("id", "userId", "lessonId", "remindAt", "status", "createdAt")
        VALUES (:id, :userId, :lessonId, :remindAt, CAST(:status AS "ReminderStatus"), :createdAt)
        """, new MapSqlParameterSource()
        .addValue("id", reminderId)
        .addValue("userId", authUser.id())
        .addValue("lessonId", lessonId)
        .addValue("remindAt", remindAt)
        .addValue("status", ReminderStatus.PENDING.name())
        .addValue("createdAt", Timestamp.from(Instant.now())));

    return Map.of("reminder", Map.of(
        "id", reminderId,
        "userId", authUser.id(),
        "lessonId", lessonId,
        "remindAt", toIso(remindAt),
        "status", ReminderStatus.PENDING.name()
    ));
  }

  public Map<String, Object> listReminders(AuthUser authUser) {
    List<Map<String, Object>> rows;
    if (authUser.role() == Role.ADMIN) {
      rows = jdbc.queryForList("""
          SELECT r."id", r."userId", r."lessonId", r."remindAt", r."status", l."title" AS "lessonTitle", l."date" AS "lessonDate"
          FROM "LessonReminder" r
          JOIN "Lesson" l ON l."id" = r."lessonId"
          ORDER BY r."remindAt" ASC
          """, Map.of());
    } else {
      rows = jdbc.queryForList("""
          SELECT r."id", r."userId", r."lessonId", r."remindAt", r."status", l."title" AS "lessonTitle", l."date" AS "lessonDate"
          FROM "LessonReminder" r
          JOIN "Lesson" l ON l."id" = r."lessonId"
          WHERE r."userId" = :userId
          ORDER BY r."remindAt" ASC
          """, Map.of("userId", authUser.id()));
    }

    List<Map<String, Object>> reminders = rows.stream().map(row -> {
      Map<String, Object> out = new LinkedHashMap<>();
      out.put("id", row.get("id"));
      out.put("userId", row.get("userId"));
      out.put("lessonId", row.get("lessonId"));
      out.put("lessonTitle", row.get("lessonTitle"));
      out.put("lessonDate", toDate(row.get("lessonDate")));
      out.put("remindAt", toIso(row.get("remindAt")));
      out.put("status", String.valueOf(row.get("status")));
      return out;
    }).toList();

    return Map.of("reminders", reminders);
  }

  public Map<String, Object> dispatchReminders(AuthUser authUser) {
    requireRole(authUser, Role.ADMIN);

    List<Map<String, Object>> due = jdbc.queryForList("""
        SELECT "id" FROM "LessonReminder"
        WHERE "status" = CAST(:status AS "ReminderStatus")
          AND "remindAt" <= :now
        """, new MapSqlParameterSource()
        .addValue("status", ReminderStatus.PENDING.name())
        .addValue("now", Timestamp.from(Instant.now())));

    int sent = 0;
    for (Map<String, Object> row : due) {
      sent += jdbc.update("""
          UPDATE "LessonReminder"
          SET "status" = CAST(:status AS "ReminderStatus"), "sentAt" = :sentAt
          WHERE "id" = :id
          """, new MapSqlParameterSource()
          .addValue("status", ReminderStatus.SENT.name())
          .addValue("sentAt", Timestamp.from(Instant.now()))
          .addValue("id", row.get("id")));
    }

    return Map.of("checked", due.size(), "sent", sent);
  }

  @Transactional
  public Map<String, Object> aiChat(AuthUser authUser, String message, String sessionId) {
    DbUser user = findUserById(authUser.id()).orElseThrow(() -> new ApiException(401, "Unauthorized"));

    Map<String, Object> session;
    if (sessionId != null && !sessionId.isBlank()) {
      session = findAiSessionById(sessionId).orElseThrow(() -> new ApiException(403, "No access to this AI session"));
      if (!Objects.equals(session.get("userId"), user.id())) {
        throw new ApiException(403, "No access to this AI session");
      }
    } else {
      String newSessionId = uuid();
      Timestamp now = Timestamp.from(Instant.now());
      String subagent = pickSubagent(Role.fromDb(user.role())).name();
      jdbc.update("""
          INSERT INTO "AISession" ("id", "userId", "roleSnapshot", "subagent", "title", "createdAt", "updatedAt")
          VALUES (:id, :userId, CAST(:roleSnapshot AS "Role"), CAST(:subagent AS "AISubagent"), :title, :createdAt, :updatedAt)
          """, new MapSqlParameterSource()
          .addValue("id", newSessionId)
          .addValue("userId", user.id())
          .addValue("roleSnapshot", user.role())
          .addValue("subagent", subagent)
          .addValue("title", getSessionTitle(message))
          .addValue("createdAt", now)
          .addValue("updatedAt", now));
      session = findAiSessionById(newSessionId).orElseThrow(() -> new ApiException(500, "Failed to create session"));
    }

    String userMessageId = uuid();
    jdbc.update("""
        INSERT INTO "AIMessage" ("id", "sessionId", "role", "content", "createdAt")
        VALUES (:id, :sessionId, CAST(:role AS "AIMessageRole"), :content, :createdAt)
        """, new MapSqlParameterSource()
        .addValue("id", userMessageId)
        .addValue("sessionId", session.get("id"))
        .addValue("role", AIMessageRole.USER.name())
        .addValue("content", message.trim())
        .addValue("createdAt", Timestamp.from(Instant.now())));

    List<Map<String, Object>> history = jdbc.queryForList("""
        SELECT "id", "role", "content", "createdAt"
        FROM "AIMessage"
        WHERE "sessionId" = :sessionId
        ORDER BY "createdAt" ASC
        LIMIT 30
        """, Map.of("sessionId", session.get("id")));

    AISubagent subagent = pickSubagent(Role.fromDb(user.role()));
    String replyText = generateAiReply(subagent, message, history);

    String assistantMessageId = uuid();
    Timestamp now = Timestamp.from(Instant.now());
    jdbc.update("""
        INSERT INTO "AIMessage" ("id", "sessionId", "role", "content", "createdAt")
        VALUES (:id, :sessionId, CAST(:role AS "AIMessageRole"), :content, :createdAt)
        """, new MapSqlParameterSource()
        .addValue("id", assistantMessageId)
        .addValue("sessionId", session.get("id"))
        .addValue("role", AIMessageRole.ASSISTANT.name())
        .addValue("content", replyText)
        .addValue("createdAt", now));

    jdbc.update("""
        UPDATE "AISession"
        SET "subagent" = CAST(:subagent AS "AISubagent"), "updatedAt" = :updatedAt
        WHERE "id" = :id
        """, new MapSqlParameterSource()
        .addValue("subagent", subagent.name())
        .addValue("updatedAt", now)
        .addValue("id", session.get("id")));

    List<Map<String, Object>> recent = jdbc.queryForList("""
        SELECT "id", "role", "content", "createdAt"
        FROM "AIMessage"
        WHERE "sessionId" = :sessionId
        ORDER BY "createdAt" ASC
        LIMIT 40
        """, Map.of("sessionId", session.get("id")));

    Map<String, Object> refreshedSession = findAiSessionById((String) session.get("id"))
        .orElseThrow(() -> new ApiException(500, "Session not found"));

    Map<String, Object> assistant = jdbc.queryForMap("""
        SELECT "id", "role", "content", "createdAt"
        FROM "AIMessage"
        WHERE "id" = :id
        """, Map.of("id", assistantMessageId));

    Map<String, Object> response = new LinkedHashMap<>();
    response.put("session", serializeAiSession(refreshedSession));
    response.put("answer", serializeAiMessage(assistant));
    response.put("messages", recent.stream().map(this::serializeAiMessage).toList());
    return response;
  }

  public Map<String, Object> aiSessions(AuthUser authUser) {
    List<Map<String, Object>> sessions = jdbc.queryForList("""
        SELECT s."id", s."title", s."subagent", s."createdAt", s."updatedAt",
               (SELECT m."content" FROM "AIMessage" m
                WHERE m."sessionId" = s."id"
                ORDER BY m."createdAt" DESC
                LIMIT 1) AS "lastMessage"
        FROM "AISession" s
        WHERE s."userId" = :userId
        ORDER BY s."updatedAt" DESC
        """, Map.of("userId", authUser.id()));

    List<Map<String, Object>> out = sessions.stream().map(row -> {
      Map<String, Object> item = new LinkedHashMap<>(serializeAiSession(row));
      item.put("lastMessage", row.get("lastMessage"));
      return item;
    }).toList();
    return Map.of("sessions", out);
  }

  public Map<String, Object> aiSessionMessages(AuthUser authUser, String sessionId) {
    Map<String, Object> session = findAiSessionById(sessionId)
        .orElseThrow(() -> new ApiException(403, "No access to this session"));

    if (!Objects.equals(session.get("userId"), authUser.id())) {
      throw new ApiException(403, "No access to this session");
    }

    List<Map<String, Object>> messages = jdbc.queryForList("""
        SELECT "id", "role", "content", "createdAt"
        FROM "AIMessage"
        WHERE "sessionId" = :sessionId
        ORDER BY "createdAt" ASC
        LIMIT 200
        """, Map.of("sessionId", sessionId));

    return Map.of(
        "session", serializeAiSession(session),
        "messages", messages.stream().map(this::serializeAiMessage).toList()
    );
  }

  private void requireAuthenticated(AuthUser authUser) {
    if (authUser == null) {
      throw new ApiException(401, "Unauthorized");
    }
  }

  private void requireRole(AuthUser authUser, Role role) {
    requireAuthenticated(authUser);
    if (authUser.role() != role) {
      throw new ApiException(403, "Недостаточно прав");
    }
  }

  private void requireRoleNot(AuthUser authUser, Role role, String message) {
    requireAuthenticated(authUser);
    if (authUser.role() == role) {
      throw new ApiException(403, message);
    }
  }

  private Optional<DbUser> findUserById(String id) {
    List<DbUser> users = jdbc.query("""
        SELECT "id", "role", "fullName", "email", "passwordHash", "age", "specialty", "about"
        FROM "User" WHERE "id" = :id
        """, Map.of("id", id), USER_MAPPER);
    return users.stream().findFirst();
  }

  private Optional<DbUser> findUserByEmail(String email) {
    List<DbUser> users = jdbc.query("""
        SELECT "id", "role", "fullName", "email", "passwordHash", "age", "specialty", "about"
        FROM "User" WHERE LOWER("email") = :email
        """, Map.of("email", email.toLowerCase(Locale.ROOT)), USER_MAPPER);
    return users.stream().findFirst();
  }

  private Optional<Map<String, Object>> findReferralByCode(String code) {
    List<Map<String, Object>> rows = jdbc.queryForList("""
        SELECT "id", "doctorId", "active", "code"
        FROM "ReferralCode"
        WHERE "code" = :code AND "active" = true
        LIMIT 1
        """, Map.of("code", code));
    return rows.stream().findFirst();
  }

  private Optional<Map<String, Object>> getLessonById(String lessonId) {
    List<Map<String, Object>> rows = jdbc.queryForList("""
        SELECT "id", "weekProgramId", "title", "description", "date", "audioUrl", "durationMin"
        FROM "Lesson" WHERE "id" = :id
        """, Map.of("id", lessonId));
    return rows.stream().findFirst();
  }

  private Map<String, Object> updateUserInternal(String userId, UserPatch patch) {
    DbUser existing = findUserById(userId).orElseThrow(() -> new ApiException(404, "Пользователь не найден"));

    String fullName = patch.fullName() != null ? patch.fullName() : existing.fullName();
    String email = patch.email() != null ? patch.email().toLowerCase(Locale.ROOT) : existing.email();
    Integer age = patch.age() != null ? patch.age() : existing.age();
    String specialty = patch.specialty() != null ? patch.specialty() : existing.specialty();
    String about = patch.about() != null ? patch.about() : existing.about();

    jdbc.update("""
        UPDATE "User"
        SET "fullName" = :fullName,
            "email" = :email,
            "age" = :age,
            "specialty" = :specialty,
            "about" = :about,
            "updatedAt" = :updatedAt
        WHERE "id" = :id
        """, new MapSqlParameterSource()
        .addValue("fullName", fullName)
        .addValue("email", email)
        .addValue("age", age)
        .addValue("specialty", specialty)
        .addValue("about", about)
        .addValue("updatedAt", Timestamp.from(Instant.now()))
        .addValue("id", userId));

    DbUser updated = findUserById(userId).orElseThrow(() -> new ApiException(404, "Пользователь не найден"));
    return serializeUser(updated);
  }

  private boolean canMessage(String firstId, String secondId) {
    Optional<DbUser> first = findUserById(firstId);
    Optional<DbUser> second = findUserById(secondId);
    if (first.isEmpty() || second.isEmpty()) {
      return false;
    }

    Role firstRole = Role.fromDb(first.get().role());
    Role secondRole = Role.fromDb(second.get().role());

    if (firstRole == Role.ADMIN || secondRole == Role.ADMIN) {
      return false;
    }

    if (firstRole == Role.DOCTOR && secondRole == Role.PATIENT) {
      Integer count = jdbc.queryForObject("""
          SELECT COUNT(*) FROM "DoctorPatientLink"
          WHERE "doctorId" = :doctorId AND "patientId" = :patientId
          """, Map.of("doctorId", firstId, "patientId", secondId), Integer.class);
      return count != null && count > 0;
    }

    if (firstRole == Role.PATIENT && secondRole == Role.DOCTOR) {
      Integer count = jdbc.queryForObject("""
          SELECT COUNT(*) FROM "DoctorPatientLink"
          WHERE "doctorId" = :doctorId AND "patientId" = :patientId
          """, Map.of("doctorId", secondId, "patientId", firstId), Integer.class);
      return count != null && count > 0;
    }

    return false;
  }

  private String nextReferralCode(String fullName) {
    String token = fullName.toUpperCase(Locale.ROOT).replaceAll("[^\\p{L}]", "");
    if (token.length() > 4) {
      token = token.substring(0, 4);
    }
    if (token.isBlank()) {
      token = "DOC";
    }

    String code;
    do {
      int random = ThreadLocalRandom.current().nextInt(1000, 10000);
      code = token + random;
    } while (isReferralCodeExists(code));

    return code;
  }

  private boolean isReferralCodeExists(String code) {
    Integer count = jdbc.queryForObject("""
        SELECT COUNT(*) FROM "ReferralCode" WHERE "code" = :code
        """, Map.of("code", code), Integer.class);
    return count != null && count > 0;
  }

  private List<Map<String, Object>> getWeeksInternal() {
    List<Map<String, Object>> weekRows = jdbc.queryForList("""
        SELECT "id", "weekNumber", "title"
        FROM "WeekProgram"
        ORDER BY "weekNumber" ASC
        """, Map.of());

    List<Map<String, Object>> lessonRows = jdbc.queryForList("""
        SELECT l."id", l."weekProgramId", l."title", l."description", l."date", l."audioUrl", l."durationMin", w."weekNumber"
        FROM "Lesson" l
        JOIN "WeekProgram" w ON w."id" = l."weekProgramId"
        ORDER BY w."weekNumber" ASC, l."date" ASC
        """, Map.of());

    Map<String, List<Map<String, Object>>> lessonsByWeek = new HashMap<>();
    for (Map<String, Object> row : lessonRows) {
      String weekId = (String) row.get("weekProgramId");
      lessonsByWeek.computeIfAbsent(weekId, key -> new ArrayList<>()).add(serializeLessonWithWeek(row));
    }

    List<Map<String, Object>> weeks = new ArrayList<>();
    for (Map<String, Object> row : weekRows) {
      String weekId = (String) row.get("id");
      Map<String, Object> item = new LinkedHashMap<>();
      item.put("id", weekId);
      item.put("weekNumber", row.get("weekNumber"));
      item.put("title", row.get("title"));
      item.put("lessons", lessonsByWeek.getOrDefault(weekId, List.of()));
      weeks.add(item);
    }

    return weeks;
  }

  private AISubagent pickSubagent(Role role) {
    return switch (role) {
      case PATIENT -> AISubagent.PATIENT_COACH;
      case DOCTOR -> AISubagent.DOCTOR_ASSISTANT;
      case ADMIN -> AISubagent.ADMIN_ASSISTANT;
    };
  }

  private String generateAiReply(AISubagent subagent, String message, List<Map<String, Object>> history) {
    String msg = message.toLowerCase(Locale.ROOT);
    long userCount = history.stream().filter(item -> "USER".equals(String.valueOf(item.get("role")))).count();
    boolean repeated = history.stream()
        .filter(item -> "USER".equals(String.valueOf(item.get("role")))
            && !Objects.equals(item.get("content"), message))
        .map(item -> String.valueOf(item.get("content")).trim().toLowerCase(Locale.ROOT))
        .anyMatch(prev -> prev.equals(msg.trim()));

    String continuity = userCount > 1
        ? "Session context is preserved from your previous messages."
        : "";

    String repeatHint = repeated
        ? "You asked a similar question, so here is a different angle."
        : "";

    return switch (subagent) {
      case PATIENT_COACH -> {
        if (msg.contains("sleep") || msg.contains("сон")) {
          yield String.join("\n\n",
              "I am your AI patient coach. This is supportive guidance and does not replace a doctor.",
              repeatHint,
              continuity,
              "Sleep focus: keep fixed bedtime, complete 1 lesson in the evening, and track sleep quality from 0 to 10.",
              "If your condition worsens, contact your doctor directly.");
        }
        if (msg.contains("calendar") || msg.contains("календар") || msg.contains("урок")) {
          yield String.join("\n\n",
              "I am your AI patient coach. This is supportive guidance and does not replace a doctor.",
              repeatHint,
              continuity,
              "Calendar focus: complete upcoming lessons in fixed slots and leave a short post-lesson note.");
        }
        yield String.join("\n\n",
            "I am your AI patient coach. This is supportive guidance and does not replace a doctor.",
            repeatHint,
            continuity,
            "Weekly plan: 3 sessions, 5-10 minutes daily breathing, and progress update in doctor chat.");
      }
      case DOCTOR_ASSISTANT -> {
        if (msg.contains("summary") || msg.contains("пациент")) {
          yield String.join("\n\n",
              "I am your AI doctor assistant. Use this as draft support, final decisions are yours.",
              repeatHint,
              continuity,
              "Summary angle: prioritize patients without recent messages and send short check-ins.");
        }
        if (msg.contains("referral") || msg.contains("код")) {
          yield String.join("\n\n",
              "I am your AI doctor assistant. Use this as draft support, final decisions are yours.",
              repeatHint,
              continuity,
              "Referral flow: create code, share with patient, verify automatic link after registration.");
        }
        yield String.join("\n\n",
            "I am your AI doctor assistant. Use this as draft support, final decisions are yours.",
            repeatHint,
            continuity,
            "Ops snapshot: review inactive patients and start with highest-risk follow-ups.");
      }
      case ADMIN_ASSISTANT -> {
        if (msg.contains("risk") || msg.contains("риски") || msg.contains("аном")) {
          yield String.join("\n\n",
              "I am your AI admin assistant. Recommendations are based on current app data snapshot.",
              continuity,
              "Risk checklist: monitor orphan patient links, reminder backlog, and referral-code hygiene.");
        }
        yield String.join("\n\n",
            "I am your AI admin assistant. Recommendations are based on current app data snapshot.",
            continuity,
            "System snapshot: monitor users, lessons, reminder queue, and referral activity.");
      }
    };
  }

  private String getSessionTitle(String firstMessage) {
    String trimmed = firstMessage == null ? "" : firstMessage.trim();
    if (trimmed.length() > 80) {
      return trimmed.substring(0, 80);
    }
    return trimmed.isBlank() ? "AI Session" : trimmed;
  }

  private Optional<Map<String, Object>> findAiSessionById(String id) {
    List<Map<String, Object>> rows = jdbc.queryForList("""
        SELECT "id", "userId", "title", "subagent", "createdAt", "updatedAt"
        FROM "AISession"
        WHERE "id" = :id
        """, Map.of("id", id));
    return rows.stream().findFirst();
  }

  private Map<String, Object> serializeAiSession(Map<String, Object> session) {
    Map<String, Object> out = new LinkedHashMap<>();
    out.put("id", session.get("id"));
    out.put("title", session.get("title"));
    out.put("subagent", String.valueOf(session.get("subagent")).toLowerCase(Locale.ROOT));
    out.put("createdAt", toIso(session.get("createdAt")));
    out.put("updatedAt", toIso(session.get("updatedAt")));
    return out;
  }

  private Map<String, Object> serializeAiMessage(Map<String, Object> item) {
    Map<String, Object> out = new LinkedHashMap<>();
    out.put("id", item.get("id"));
    out.put("role", String.valueOf(item.get("role")).toLowerCase(Locale.ROOT));
    out.put("content", item.get("content"));
    out.put("createdAt", toIso(item.get("createdAt")));
    return out;
  }

  private Map<String, Object> serializeUser(DbUser user) {
    Map<String, Object> out = new LinkedHashMap<>();
    out.put("id", user.id());
    out.put("role", Role.fromDb(user.role()).toClientRole());
    out.put("fullName", user.fullName());
    out.put("email", user.email());
    out.put("age", user.age());
    out.put("specialty", user.specialty());
    out.put("about", user.about());
    return out;
  }

  private Map<String, Object> serializeLessonWithWeek(Map<String, Object> lessonRow) {
    Map<String, Object> out = new LinkedHashMap<>();
    out.put("id", lessonRow.get("id"));
    out.put("weekNumber", lessonRow.get("weekNumber"));
    out.put("title", lessonRow.get("title"));
    out.put("description", lessonRow.get("description"));
    out.put("date", toDate(lessonRow.get("date")));
    out.put("audioUrl", lessonRow.get("audioUrl"));
    out.put("durationMin", lessonRow.get("durationMin"));
    return out;
  }

  private Map<String, Object> serializeMessage(Map<String, Object> row) {
    Map<String, Object> out = new LinkedHashMap<>();
    out.put("id", row.get("id"));
    out.put("fromId", row.get("fromId"));
    out.put("toId", row.get("toId"));
    out.put("text", row.get("text"));
    out.put("createdAt", toIso(row.get("createdAt")));
    return out;
  }

  private Map<String, Object> serializeReferral(Map<String, Object> row) {
    Map<String, Object> out = new LinkedHashMap<>();
    out.put("id", row.get("id"));
    out.put("code", row.get("code"));
    out.put("doctorId", row.get("doctorId"));
    out.put("active", row.get("active"));
    out.put("usedByPatientId", row.get("usedByPatientId"));
    out.put("createdAt", toIso(row.get("createdAt")));
    return out;
  }

  private Map<String, Object> serializeLink(Map<String, Object> row) {
    return Map.of(
        "doctorId", row.get("doctorId"),
        "patientId", row.get("patientId")
    );
  }

  private LocalDate toLocalDate(Object raw) {
    if (raw instanceof Timestamp ts) {
      return ts.toLocalDateTime().toLocalDate();
    }
    if (raw instanceof LocalDateTime ldt) {
      return ldt.toLocalDate();
    }
    if (raw instanceof LocalDate ld) {
      return ld;
    }
    if (raw instanceof Instant instant) {
      return instant.atZone(ZoneOffset.UTC).toLocalDate();
    }
    return LocalDate.parse(String.valueOf(raw).substring(0, 10));
  }

  private String toIso(Object raw) {
    if (raw instanceof Timestamp ts) {
      return ts.toInstant().toString();
    }
    if (raw instanceof Instant instant) {
      return instant.toString();
    }
    if (raw instanceof LocalDateTime ldt) {
      return ldt.toInstant(ZoneOffset.UTC).toString();
    }
    if (raw instanceof LocalDate ld) {
      return ld.atStartOfDay().toInstant(ZoneOffset.UTC).toString();
    }
    return String.valueOf(raw);
  }

  private String toDate(Object raw) {
    LocalDate date = toLocalDate(raw);
    return date.toString();
  }

  private String uuid() {
    return UUID.randomUUID().toString();
  }

  private String nowIso() {
    return Instant.now().toString();
  }

  private record DbUser(
      String id,
      String role,
      String fullName,
      String email,
      String passwordHash,
      Integer age,
      String specialty,
      String about
  ) {
  }

  public record UserPatch(String fullName, String email, Integer age, String specialty, String about) {
  }

  public record LessonPatch(String title, String description, String date, Integer durationMin, String audioUrl) {
  }
}
