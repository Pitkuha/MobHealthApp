package com.mobhealth.backendjava.config;

import com.zaxxer.hikari.HikariDataSource;
import java.net.URI;
import java.net.URISyntaxException;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;

@Configuration
public class DataSourceConfig {
  @Bean
  public DataSource dataSource(
      @Value("${DATABASE_URL:}") String rawDatabaseUrl,
      @Value("${spring.datasource.url:jdbc:postgresql://localhost:5432/mob_health}") String fallbackJdbcUrl,
      @Value("${DB_USER:pitkuha}") String defaultUser,
      @Value("${DB_PASSWORD:}") String defaultPassword
  ) {
    HikariDataSource dataSource = new HikariDataSource();

    ResolvedUrl resolved = resolveDatabaseUrl(rawDatabaseUrl, fallbackJdbcUrl, defaultUser, defaultPassword);
    dataSource.setJdbcUrl(resolved.jdbcUrl());
    dataSource.setUsername(resolved.username());
    dataSource.setPassword(resolved.password());

    return dataSource;
  }

  private ResolvedUrl resolveDatabaseUrl(
      String rawDatabaseUrl,
      String fallbackJdbcUrl,
      String defaultUser,
      String defaultPassword
  ) {
    if (!StringUtils.hasText(rawDatabaseUrl)) {
      return new ResolvedUrl(fallbackJdbcUrl, defaultUser, defaultPassword);
    }

    String trimmed = rawDatabaseUrl.trim();
    if (trimmed.startsWith("jdbc:postgresql://")) {
      return new ResolvedUrl(trimmed, defaultUser, defaultPassword);
    }

    if (!trimmed.startsWith("postgresql://")) {
      return new ResolvedUrl(fallbackJdbcUrl, defaultUser, defaultPassword);
    }

    try {
      URI uri = new URI(trimmed);
      String host = uri.getHost();
      int port = uri.getPort() > 0 ? uri.getPort() : 5432;
      String path = uri.getPath() == null ? "" : uri.getPath();
      String query = uri.getQuery();

      String jdbcUrl = "jdbc:postgresql://" + host + ":" + port + path + (query == null ? "" : "?" + query);

      String username = defaultUser;
      String password = defaultPassword;
      if (StringUtils.hasText(uri.getUserInfo())) {
        String[] userParts = uri.getUserInfo().split(":", 2);
        if (userParts.length > 0 && StringUtils.hasText(userParts[0])) {
          username = userParts[0];
        }
        if (userParts.length > 1) {
          password = userParts[1];
        }
      }

      return new ResolvedUrl(jdbcUrl, username, password);
    } catch (URISyntaxException ex) {
      return new ResolvedUrl(fallbackJdbcUrl, defaultUser, defaultPassword);
    }
  }

  private record ResolvedUrl(String jdbcUrl, String username, String password) {
  }
}
