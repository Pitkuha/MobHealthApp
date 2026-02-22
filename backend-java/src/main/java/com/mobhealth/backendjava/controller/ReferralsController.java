package com.mobhealth.backendjava.controller;

import com.mobhealth.backendjava.security.AuthContext;
import com.mobhealth.backendjava.service.MobHealthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/referrals")
public class ReferralsController {
  private final MobHealthService service;

  public ReferralsController(MobHealthService service) {
    this.service = service;
  }

  @PostMapping
  public Map<String, Object> create(HttpServletRequest request) {
    return service.createReferralCode(AuthContext.require(request));
  }

  @PatchMapping("/{id}")
  public Map<String, Object> update(
      HttpServletRequest request,
      @PathVariable("id") String id,
      @Valid @RequestBody ToggleRequest body
  ) {
    return service.toggleReferralCodeByAdmin(AuthContext.require(request), id, body.active());
  }

  @GetMapping
  public Map<String, Object> list(HttpServletRequest request) {
    return service.listReferralCodes(AuthContext.require(request));
  }

  public record ToggleRequest(boolean active) {
  }
}
