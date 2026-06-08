import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { unauthorized, forbidden } from '../utils/response';

export interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string };
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];
  if (!token) return unauthorized(res);
  try {
    const decoded = verifyAccessToken(token) as { id: string; email: string; role: string };
    req.user = decoded;
    next();
  } catch {
    return unauthorized(res, 'Invalid or expired token');
  }
}

export function authorize(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return forbidden(res, 'Insufficient permissions');
    }
    next();
  };
}
