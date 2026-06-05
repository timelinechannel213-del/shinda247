import { db } from '../client';
import { sessions, otpCodes } from '../schema';
import { lt } from 'drizzle-orm';

export async function cleanupExpiredSessions(): Promise<number> {
  const deleted = await db
    .delete(sessions)
    .where(lt(sessions.expiresAt, new Date()))
    .returning({ id: sessions.id });
  return deleted.length;
}

export async function cleanupExpiredOtps(): Promise<number> {
  const deleted = await db
    .delete(otpCodes)
    .where(lt(otpCodes.expiresAt, new Date()))
    .returning({ id: otpCodes.id });
  return deleted.length;
}
