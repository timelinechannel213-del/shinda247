import type { Request, Response, NextFunction } from 'express';
import { db } from '@workspace/db';
import { sessions, users } from '@workspace/db';
import { eq, and, gt } from 'drizzle-orm';

export interface AuthRequest extends Request {
  userId?: number;
  username?: string;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const [session] = await db
      .select({ userId: sessions.userId })
      .from(sessions)
      .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())));

    if (!session) {
      res.status(401).json({ error: 'Session expired or invalid' });
      return;
    }

    const [user] = await db
      .select({ id: users.id, username: users.username })
      .from(users)
      .where(and(eq(users.id, session.userId), eq(users.isActive, true)));

    if (!user) {
      res.status(401).json({ error: 'User not found or deactivated' });
      return;
    }

    req.userId   = user.id;
    req.username = user.username;
    next();
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.slice(7);

  try {
    const [session] = await db
      .select({ userId: sessions.userId })
      .from(sessions)
      .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())));

    if (session) {
      const [user] = await db
        .select({ id: users.id, username: users.username })
        .from(users)
        .where(eq(users.id, session.userId));

      if (user) {
        req.userId   = user.id;
        req.username = user.username;
      }
    }
  } catch {}

  next();
}
