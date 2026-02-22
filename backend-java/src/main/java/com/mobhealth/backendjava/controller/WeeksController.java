package com.mobhealth.backendjava.controller;

import com.mobhealth.backendjava.security.AuthContext;
import com.mobhealth.backendjava.service.MobHealthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
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
@RequestMapping("/api/weeks")
public class WeeksController {
  private final MobHealthService service;

  public WeeksController(MobHealthService service) {
    this.service = service;
  }

  @GetMapping
  public Map<String, Object> listWeeks(HttpServletRequest request) {
    return service.listWeeks(AuthContext.require(request));
  }

  @PatchMapping("/lessons/{lessonId}")
  public Map<String, Object> patchLesson(
      HttpServletRequest request,
      @PathVariable("lessonId") String lessonId,
      @Valid @RequestBody LessonPatchRequest patch
  ) {
    MobHealthService.LessonPatch payload = new MobHealthService.LessonPatch(
        patch.title(),
        patch.description(),
        patch.date(),
        patch.durationMin(),
        patch.audioUrl()
    );
    return service.updateLessonByAdmin(AuthContext.require(request), lessonId, payload);
  }

  public record LessonPatchRequest(
      @Size(min = 2) String title,
      @Size(min = 2) String description,
      String date,
      @Min(1) Integer durationMin,
      String audioUrl
  ) {
  }
}
