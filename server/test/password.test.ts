import { describe, expect, it } from 'vitest';
import { comparePassword, hashPassword } from '../src/utils/password';

describe('password utils', () => {
  it('hashes and verifies password', async () => {
    const hash = await hashPassword('secret123');
    const ok = await comparePassword('secret123', hash);
    const wrong = await comparePassword('wrong', hash);

    expect(ok).toBe(true);
    expect(wrong).toBe(false);
  });
});
