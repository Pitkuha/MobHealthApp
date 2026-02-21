import { Role } from '@prisma/client';

export interface AuthContextUser {
  id: string;
  role: Role;
  email: string;
}

export interface JwtPayload {
  sub: string;
  role: Role;
  email: string;
}
