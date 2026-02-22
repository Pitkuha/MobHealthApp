package com.mobhealth.backendjava.controller;

import com.mobhealth.backendjava.security.AuthContext;
import com.mobhealth.backendjava.service.MobHealthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/chat")
public class ChatController {
  private final MobHealthService service;

  public ChatController(MobHealthService service) {
    this.service = service;
  }

  @PostMapping("/messages")
  public Map<String, Object> sendMessage(HttpServletRequest request, @Valid @RequestBody SendMessageRequest body) {
    return service.sendMessage(AuthContext.require(request), body.toId(), body.text());
  }

  @GetMapping("/messages")
  public Map<String, Object> listMessages(HttpServletRequest request, @RequestParam("withUserId") String withUserId) {
    return service.listMessages(AuthContext.require(request), withUserId);
  }

  public record SendMessageRequest(
      @NotBlank String toId,
      @NotBlank @Size(max = 2000) String text
  ) {
  }
}
