package com.mobhealth.backendjava.controller;

import com.mobhealth.backendjava.security.AuthContext;
import com.mobhealth.backendjava.service.MobHealthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notifications")
public class NotificationsController {
  private final MobHealthService service;

  public NotificationsController(MobHealthService service) {
    this.service = service;
  }

  @PostMapping("/tokens")
  public Map<String, Object> registerToken(HttpServletRequest request, @Valid @RequestBody RegisterTokenRequest body) {
    return service.registerPushToken(AuthContext.require(request), body.token());
  }

  @PostMapping("/reminders")
  public Map<String, Object> createReminder(HttpServletRequest request, @Valid @RequestBody CreateReminderRequest body) {
    return service.createReminder(AuthContext.require(request), body.lessonId(), body.minutesBefore());
  }

  @GetMapping("/reminders")
  public Map<String, Object> listReminders(HttpServletRequest request) {
    return service.listReminders(AuthContext.require(request));
  }

  @PostMapping("/dispatch")
  public Map<String, Object> dispatch(HttpServletRequest request) {
    return service.dispatchReminders(AuthContext.require(request));
  }

  public record RegisterTokenRequest(@NotBlank String token) {
  }

  public record CreateReminderRequest(
      @NotBlank String lessonId,
      @Min(5) @Max(24 * 60) int minutesBefore
  ) {
  }
}
