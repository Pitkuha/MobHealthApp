package com.mobhealth.backendjava.security;

import com.mobhealth.backendjava.config.ApiException;
import com.mobhealth.backendjava.service.MobHealthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class AuthInterceptor implements HandlerInterceptor {
  private final JwtService jwtService;
  private final MobHealthService mobHealthService;

  public AuthInterceptor(JwtService jwtService, MobHealthService mobHealthService) {
    this.jwtService = jwtService;
    this.mobHealthService = mobHealthService;
  }

  @Override
  public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
    if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
      return true;
    }

    String requestUri = normalizePath(request.getRequestURI());
    if (isPublicPath(requestUri)) {
      return true;
    }

    String authHeader = request.getHeader("Authorization");
    if (authHeader == null || !authHeader.startsWith("Bearer ")) {
      throw new ApiException(401, "Unauthorized");
    }

    String token = authHeader.substring(7);
    AuthUser jwtUser;
    try {
      jwtUser = jwtService.verify(token);
    } catch (Exception ex) {
      throw new ApiException(401, "Invalid or expired token");
    }

    AuthUser realUser = mobHealthService.findAuthUserById(jwtUser.id())
        .orElseThrow(() -> new ApiException(401, "Unauthorized"));

    request.setAttribute(AuthContext.ATTR, realUser);
    return true;
  }

  private String normalizePath(String rawPath) {
    if (rawPath == null || rawPath.isBlank()) {
      return "/";
    }
    if (rawPath.length() > 1 && rawPath.endsWith("/")) {
      return rawPath.substring(0, rawPath.length() - 1);
    }
    return rawPath;
  }

  private boolean isPublicPath(String path) {
    return "/api/health".equals(path)
        || "/api/auth/login".equals(path)
        || "/api/auth/register-patient".equals(path);
  }
}
