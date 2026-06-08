import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { ok, badRequest, unauthorized } from '../utils/response';

const prisma = new PrismaClient();

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
};

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  if (!email || !password) return badRequest(res, 'Email and password required');

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.is_active) return unauthorized(res, 'Invalid credentials');

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return unauthorized(res, 'Invalid credentials');

  const payload = { id: user.id, email: user.email, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });

  res.cookie('accessToken', accessToken, { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 });
  res.cookie('refreshToken', refreshToken, { ...COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 });

  return ok(res, { user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role } });
}

export async function refresh(req: Request, res: Response) {
  const token = req.cookies?.refreshToken;
  if (!token) return unauthorized(res, 'No refresh token');

  try {
    const decoded = verifyRefreshToken(token) as { id: string; email: string; role: string };
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user || user.refreshToken !== token) return unauthorized(res, 'Invalid refresh token');

    const payload = { id: user.id, email: user.email, role: user.role };
    const accessToken = signAccessToken(payload);
    res.cookie('accessToken', accessToken, { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 });
    return ok(res, { accessToken });
  } catch {
    return unauthorized(res, 'Invalid refresh token');
  }
}

export async function logout(req: Request, res: Response) {
  const token = req.cookies?.refreshToken;
  if (token) {
    try {
      const decoded = verifyRefreshToken(token) as { id: string };
      await prisma.user.update({ where: { id: decoded.id }, data: { refreshToken: null } });
    } catch {}
  }
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  return ok(res, null, 'Logged out');
}

export async function changePassword(req: Request, res: Response) {
  const { currentPassword, newPassword } = req.body;
  const userId = (req as any).user?.id;
  if (!userId) return unauthorized(res);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return unauthorized(res);

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) return badRequest(res, 'Current password is incorrect');

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } });
  return ok(res, null, 'Password changed successfully');
}

export async function getProfile(req: Request, res: Response) {
  const userId = (req as any).user?.id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, full_name: true, role: true },
  });
  return ok(res, user);
}
