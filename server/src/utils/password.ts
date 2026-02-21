import bcrypt from 'bcryptjs';

export async function hashPassword(rawPassword: string): Promise<string> {
  return bcrypt.hash(rawPassword, 10);
}

export async function comparePassword(rawPassword: string, hash: string): Promise<boolean> {
  return bcrypt.compare(rawPassword, hash);
}
