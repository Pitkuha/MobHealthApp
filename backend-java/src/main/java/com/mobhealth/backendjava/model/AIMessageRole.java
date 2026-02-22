package com.mobhealth.backendjava.model;

public enum AIMessageRole {
  USER,
  ASSISTANT,
  SYSTEM;

  public String toClientValue() {
    return name().toLowerCase();
  }
}
