import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export function notFound(_req: Request, res: Response) {
  res.status(404).json({
    error: {
      message: 'Route not found',
      code: 'NOT_FOUND'
    }
  });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: err.flatten()
      }
    });
    return;
  }

  const status = typeof err === 'object' && err && 'status' in err && typeof err.status === 'number'
    ? err.status
    : 500;

  const message = typeof err === 'object' && err && 'message' in err && typeof err.message === 'string'
    ? err.message
    : 'Internal server error';

  res.status(status).json({
    error: {
      message,
      code: status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR'
    }
  });
}
