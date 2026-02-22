package com.mobhealth.backendjava.controller;

import com.mobhealth.backendjava.security.AuthContext;
import com.mobhealth.backendjava.service.MobHealthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UsersController {
  private final MobHealthService service;

  public UsersController(MobHealthService service) {
    this.service = service;
  }

  @PatchMapping("/me")
  public Map<String, Object> patchMe(HttpServletRequest request, @Valid @RequestBody UserPatchRequest patch) {
    return service.updateOwnUser(AuthContext.require(request), toPatch(patch));
  }

  @PatchMapping("/{id}")
  public Map<String, Object> patchByAdmin(HttpServletRequest request, @PathVariable("id") String id,
                                          @Valid @RequestBody UserPatchRequest patch) {
    return service.updateUserByAdmin(AuthContext.require(request), id, toPatch(patch));
  }

  @GetMapping
  public Map<String, Object> listUsers(HttpServletRequest request) {
    return service.listUsers(AuthContext.require(request));
  }

  private MobHealthService.UserPatch toPatch(UserPatchRequest patch) {
    return new MobHealthService.UserPatch(patch.fullName(), patch.email(), patch.age(), patch.specialty(), patch.about());
  }

  public record UserPatchRequest(
      @Size(min = 2, message = "fullName must have at least 2 chars") String fullName,
      @Email String email,
      @Min(1) Integer age,
      @Size(min = 2, message = "specialty must have at least 2 chars") String specialty,
      @Size(max = 500, message = "about max length is 500") String about
  ) {
  }
}
