package com.mobhealth.backendjava.model;

public enum Role {
  PATIENT,
  DOCTOR,
  ADMIN;

  public String toClientRole() {
    return switch (this) {
      case PATIENT -> "patient";
      case DOCTOR -> "doctor";
      case ADMIN -> "admin";
    };
  }

  public static Role fromDb(String value) {
    return Role.valueOf(value);
  }
}
