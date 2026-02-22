package com.mobhealth.backendjava.controller;

import com.mobhealth.backendjava.security.AuthContext;
import com.mobhealth.backendjava.service.MobHealthService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/bootstrap")
public class BootstrapController {
  private final MobHealthService service;

  public BootstrapController(MobHealthService service) {
    this.service = service;
  }

  @GetMapping
  public Map<String, Object> bootstrap(HttpServletRequest request) {
    return service.bootstrap(AuthContext.require(request));
  }
}
