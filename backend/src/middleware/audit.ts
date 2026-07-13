import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

const ACTION_MAP: Record<string, string> = { POST: 'CREATE', PUT: 'UPDATE', PATCH: 'UPDATE', DELETE: 'DELETE' };

export function auditLog(resource: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const action = ACTION_MAP[req.method];
    if (!action) return next();

    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      if (body?.success) {
        const user = (req as any).user;
        const resourceId = req.params?.id || body?.data?.id || null;
        prisma.auditLog.create({
          data: {
            user_id: user?.id || null,
            // the JWT payload only carries id/email/role, not full_name, so fall back to email
            user_name: user?.full_name || user?.email || null,
            action,
            resource,
            resource_id: resourceId,
            new_values: action !== 'DELETE' ? (req.body || null) : null,
            ip_address: req.ip || null,
          },
        }).catch(() => {});
      }
      return originalJson(body);
    };
    next();
  };
}
