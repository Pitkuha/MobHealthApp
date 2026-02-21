import { Role } from '@prisma/client';
import createError from 'http-errors';
import { NextFunction, Request, Response } from 'express';

export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const role = req.authUser?.role;
    if (!role) {
      return next(createError(401, 'Unauthorized'));
    }

    if (!allowedRoles.includes(role)) {
      return next(createError(403, 'Forbidden'));
    }

    return next();
  };
}
