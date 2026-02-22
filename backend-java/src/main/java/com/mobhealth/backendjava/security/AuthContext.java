package com.mobhealth.backendjava.security;

import com.mobhealth.backendjava.config.ApiException;
import jakarta.servlet.http.HttpServletRequest;

public final class AuthContext {
  public static final String ATTR = "authUser";

  private AuthContext() {
  }

  public static AuthUser require(HttpServletRequest request) {
    Object value = request.getAttribute(ATTR);
    if (value instanceof AuthUser authUser) {
      return authUser;
    }
    throw new ApiException(401, "Unauthorized");
  }
}
