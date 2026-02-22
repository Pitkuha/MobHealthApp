package com.mobhealth.backendjava.controller;

import com.mobhealth.backendjava.security.AuthContext;
import com.mobhealth.backendjava.service.MobHealthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
  private final MobHealthService service;

  public AuthController(MobHealthService service) {
    this.service = service;
  }

  @PostMapping("/login")
  public Map<String, Object> login(@Valid @RequestBody LoginRequest request) {
    return service.login(request.email(), request.password());
  }

  @PostMapping("/register-patient")
  public Map<String, Object> registerPatient(@Valid @RequestBody RegisterPatientRequest request) {
    return service.registerPatient(
        request.fullName(),
        request.email(),
        request.password(),
        request.referralCode(),
        request.age()
    );
  }

  @GetMapping("/me")
  public Map<String, Object> me(HttpServletRequest httpRequest) {
    return service.me(AuthContext.require(httpRequest));
  }

  public record LoginRequest(
      @Email String email,
      @Size(min = 6, message = "Password must have at least 6 characters") String password
  ) {
  }

  public record RegisterPatientRequest(
      @NotBlank @Size(min = 2) String fullName,
      @Email String email,
      @Size(min = 6) String password,
      @NotBlank @Size(min = 3) String referralCode,
      @Min(1) Integer age
  ) {
  }
}
