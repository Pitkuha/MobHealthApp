package com.mobhealth.backendjava.security;

import com.mobhealth.backendjava.model.Role;

public record AuthUser(String id, Role role, String email) {
}
