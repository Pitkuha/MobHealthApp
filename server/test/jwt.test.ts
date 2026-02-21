import { describe, expect, it } from 'vitest';

process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/mob_health';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '7d';

const { signAccessToken, verifyAccessToken } = await import('../src/utils/jwt');

describe('jwt utils', () => {
  it('signs and verifies token', () => {
    const token = signAccessToken({
      id: 'user-1',
      role: 'PATIENT',
      email: 'anna@example.com'
    });

    const payload = verifyAccessToken(token);

    expect(payload.sub).toBe('user-1');
    expect(payload.role).toBe('PATIENT');
    expect(payload.email).toBe('anna@example.com');
  });
});
