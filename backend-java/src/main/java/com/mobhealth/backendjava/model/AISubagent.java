package com.mobhealth.backendjava.model;

public enum AISubagent {
  PATIENT_COACH,
  DOCTOR_ASSISTANT,
  ADMIN_ASSISTANT;

  public String toClientValue() {
    return name().toLowerCase();
  }
}
