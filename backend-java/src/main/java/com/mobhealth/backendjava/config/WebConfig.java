package com.mobhealth.backendjava.config;

import com.mobhealth.backendjava.security.AuthInterceptor;
import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
  private final AuthInterceptor authInterceptor;
  private final List<String> corsOrigins;

  public WebConfig(AuthInterceptor authInterceptor, @Value("${app.cors-origin}") String corsOrigins) {
    this.authInterceptor = authInterceptor;
    this.corsOrigins = Arrays.stream(corsOrigins.split(","))
        .map(String::trim)
        .filter(item -> !item.isEmpty())
        .toList();
  }

  @Override
  public void addCorsMappings(CorsRegistry registry) {
    registry.addMapping("/**")
        .allowedOrigins(corsOrigins.toArray(String[]::new))
        .allowedMethods("GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS")
        .allowedHeaders("*")
        .allowCredentials(false);
  }

  @Override
  public void addInterceptors(InterceptorRegistry registry) {
    registry.addInterceptor(authInterceptor)
        .addPathPatterns("/api/**")
        .excludePathPatterns(
            "/api/health",
            "/api/auth/login",
            "/api/auth/register-patient"
        );
  }
}
