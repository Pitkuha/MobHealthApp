package com.mobhealth.backendjava.security;

import com.mobhealth.backendjava.model.Role;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class JwtService {
  private final SecretKey key;
  private final Duration expiration;

  public JwtService(@Value("${app.jwt-secret}") String secret,
                    @Value("${app.jwt-expires-in:7d}") String expiresIn) {
    byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
    if (bytes.length < 32) {
      byte[] padded = new byte[32];
      System.arraycopy(bytes, 0, padded, 0, Math.min(bytes.length, 32));
      for (int i = bytes.length; i < 32; i += 1) {
        padded[i] = (byte) 'x';
      }
      bytes = padded;
    }
    this.key = Keys.hmacShaKeyFor(bytes);
    this.expiration = parseExpiresIn(expiresIn);
  }

  public String sign(AuthUser authUser) {
    Instant now = Instant.now();
    return Jwts.builder()
        .subject(authUser.id())
        .claim("role", authUser.role().name())
        .claim("email", authUser.email())
        .issuedAt(Date.from(now))
        .expiration(Date.from(now.plus(expiration)))
        .signWith(key)
        .compact();
  }

  public AuthUser verify(String token) {
    Claims claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
    String sub = claims.getSubject();
    String role = claims.get("role", String.class);
    String email = claims.get("email", String.class);
    if (sub == null || role == null || email == null) {
      throw new IllegalArgumentException("Invalid token payload");
    }
    return new AuthUser(sub, Role.fromDb(role), email);
  }

  private Duration parseExpiresIn(String value) {
    String normalized = value == null ? "7d" : value.trim().toLowerCase();
    if (normalized.isEmpty()) {
      return Duration.ofDays(7);
    }

    char suffix = normalized.charAt(normalized.length() - 1);
    String numberPart = Character.isLetter(suffix)
        ? normalized.substring(0, normalized.length() - 1)
        : normalized;
    long amount = Long.parseLong(numberPart);

    return switch (suffix) {
      case 'd' -> Duration.ofDays(amount);
      case 'h' -> Duration.ofHours(amount);
      case 'm' -> Duration.ofMinutes(amount);
      case 's' -> Duration.ofSeconds(amount);
      default -> Duration.ofDays(amount);
    };
  }
}
