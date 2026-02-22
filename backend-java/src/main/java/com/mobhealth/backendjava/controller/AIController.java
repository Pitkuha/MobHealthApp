package com.mobhealth.backendjava.controller;

import com.mobhealth.backendjava.security.AuthContext;
import com.mobhealth.backendjava.service.MobHealthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai")
public class AIController {
  private final MobHealthService service;

  public AIController(MobHealthService service) {
    this.service = service;
  }

  @PostMapping("/chat")
  public Map<String, Object> chat(HttpServletRequest request, @Valid @RequestBody AIChatRequest body) {
    return service.aiChat(AuthContext.require(request), body.message(), body.sessionId());
  }

  @GetMapping("/sessions")
  public Map<String, Object> sessions(HttpServletRequest request) {
    return service.aiSessions(AuthContext.require(request));
  }

  @GetMapping("/sessions/{sessionId}/messages")
  public Map<String, Object> sessionMessages(HttpServletRequest request, @PathVariable("sessionId") String sessionId) {
    return service.aiSessionMessages(AuthContext.require(request), sessionId);
  }

  public record AIChatRequest(
      @NotBlank @Size(max = 4000) String message,
      String sessionId
  ) {
  }
}
