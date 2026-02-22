package com.mobhealth.backendjava.config;

import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(ApiException.class)
  public ResponseEntity<Map<String, Object>> handleApi(ApiException ex) {
    return ResponseEntity.status(ex.getStatus())
        .body(Map.of("error", Map.of("message", ex.getMessage())));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
    String message = "Validation error";
    FieldError fieldError = ex.getBindingResult().getFieldError();
    if (fieldError != null && fieldError.getDefaultMessage() != null) {
      message = fieldError.getDefaultMessage();
    }
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(Map.of("error", Map.of("message", message)));
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<Map<String, Object>> handleAny(Exception ex) {
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(Map.of("error", Map.of("message", ex.getMessage() == null ? "Internal server error" : ex.getMessage())));
  }
}
