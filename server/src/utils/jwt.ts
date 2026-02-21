import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthContextUser, JwtPayload } from '../types';

export function signAccessToken(user: AuthContextUser): string {
  const expiresIn = env.jwtExpiresIn as jwt.SignOptions['expiresIn'];

  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      email: user.email
    },
    env.jwtSecret,
    {
      expiresIn
    }
  );
}

export function verifyAccessToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, env.jwtSecret);
  if (typeof decoded === 'string') {
    throw new Error('Invalid token payload');
  }

  const sub = decoded.sub;
  if (!sub || typeof sub !== 'string' || typeof decoded.role !== 'string' || typeof decoded.email !== 'string') {
    throw new Error('Invalid token payload');
  }

  return {
    sub,
    role: decoded.role as JwtPayload['role'],
    email: decoded.email
  };
}
