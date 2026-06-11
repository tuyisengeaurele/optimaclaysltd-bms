import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  const status = err.status || err.statusCode || 500;

  // Never leak internal error details (stack traces, DB errors) in production
  const message = process.env.NODE_ENV === 'production' && status === 500
    ? 'An unexpected error occurred. Please try again later.'
    : err.message || 'Internal Server Error';

  if (status === 500) {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}`, err);
  }

  res.status(status).json({ success: false, message });
}
