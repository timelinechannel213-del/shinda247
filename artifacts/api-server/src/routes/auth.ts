import { Router, type IRouter } from 'express';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { db } from '@workspace/db';
import { users, otpCodes, sessions, wallets, transactions } from '@workspace/db';
import { eq, and, gt } from 'drizzle-orm';
import { logger } from '../lib/logger';
import { requireAuth, type AuthRequest } from '../middleware/auth';

const router: IRouter = Router();
const SALT_ROUNDS = 10;

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length === 10) return '254' + digits.slice(1);
  if (digits.startsWith('254') && digits.length === 12) return digits;
  if (digits.startsWith('7') && digits.length === 9) return '254' + digits;
  return digits;
}

function generateToken(): string {
  return randomBytes(48).toString('hex');
}

router.post('/auth/register', async (req, res) => {
  const { phone, username, password } = req.body as { phone?: string; username?: string; password?: string };

  if (!phone || !username || !password) {
    res.status(400).json({ error: 'phone, username, and password are required' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }

  const normalized = normalizePhone(phone);
  if (normalized.length !== 12) {
    res.status(400).json({ error: 'Invalid phone number. Use format: 254XXXXXXXXX' });
    return;
  }

  const cleanUsername = username.trim().replace(/[^a-zA-Z0-9_]/g, '').slice(0, 32);
  if (cleanUsername.length < 3) {
    res.status(400).json({ error: 'Username must be at least 3 alphanumeric characters' });
    return;
  }

  const [existingPhone] = await db.select().from(users).where(eq(users.phone, normalized));
  if (existingPhone) { res.status(409).json({ error: 'Phone number already registered' }); return; }

  const [existingUser] = await db.select().from(users).where(eq(users.username, cleanUsername));
  if (existingUser) { res.status(409).json({ error: 'Username already taken' }); return; }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const [user] = await db.insert(users).values({
    phone:        normalized,
    username:     cleanUsername,
    passwordHash,
    isActive:     true,
  }).returning({ id: users.id, username: users.username });

  await db.insert(wallets).values({ userId: user.id, balanceCents: 0 });

  const token     = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ userId: user.id, token, expiresAt });

  logger.info({ userId: user.id, username: user.username }, 'User registered');

  res.json({ success: true, token, userId: user.id, username: user.username });
});

router.post('/auth/login', async (req, res) => {
  const { phone, password } = req.body as { phone?: string; password?: string };

  if (!phone || !password) {
    res.status(400).json({ error: 'phone and password are required' });
    return;
  }

  const normalized = normalizePhone(phone);

  const [user] = await db
    .select({ id: users.id, username: users.username, passwordHash: users.passwordHash, isActive: users.isActive })
    .from(users)
    .where(eq(users.phone, normalized));

  if (!user) { res.status(404).json({ error: 'Phone not registered. Please register first.' }); return; }
  if (!user.isActive) { res.status(403).json({ error: 'Account deactivated' }); return; }

  const valid = user.passwordHash
    ? await bcrypt.compare(password, user.passwordHash)
    : false;

  if (!valid) { res.status(401).json({ error: 'Incorrect password' }); return; }

  const token     = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ userId: user.id, token, expiresAt });

  res.json({ success: true, token, userId: user.id, username: user.username });
});

router.post('/auth/logout', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    await db.delete(sessions).where(eq(sessions.token, token));
  }
  res.json({ success: true });
});

router.get('/auth/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) { res.status(401).json({ error: 'Not authenticated' }); return; }

  const token = authHeader.slice(7);
  const [session] = await db
    .select({ userId: sessions.userId })
    .from(sessions)
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())));

  if (!session) { res.status(401).json({ error: 'Session expired' }); return; }

  const [user] = await db
    .select({ id: users.id, username: users.username, phone: users.phone, isAdmin: users.isAdmin })
    .from(users)
    .where(eq(users.id, session.userId));

  if (!user) { res.status(404).json({ error: 'User not found' }); return; }

  const [wallet] = await db
    .select({ balanceCents: wallets.balanceCents })
    .from(wallets)
    .where(eq(wallets.userId, user.id));

  res.json({
    userId:       user.id,
    username:     user.username,
    phone:        user.phone,
    isAdmin:      user.isAdmin,
    balanceCents: wallet?.balanceCents ?? 0,
  });
});

router.get('/auth/profile', requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!;

  const [user] = await db
    .select({ id: users.id, username: users.username, phone: users.phone, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) { res.status(404).json({ error: 'User not found' }); return; }

  const [wallet] = await db
    .select({ balanceCents: wallets.balanceCents, totalDeposited: wallets.totalDeposited, totalWithdrawn: wallets.totalWithdrawn })
    .from(wallets)
    .where(eq(wallets.userId, userId));

  const txns = await db
    .select({ type: transactions.type, amountCents: transactions.amountCents })
    .from(transactions)
    .where(eq(transactions.userId, userId));

  let totalWonCents = 0, totalBetCents = 0;
  for (const t of txns) {
    if (t.type === 'win') totalWonCents += Number(t.amountCents);
    if (t.type === 'bet') totalBetCents += Number(t.amountCents);
  }

  res.json({
    userId:              user.id,
    username:            user.username,
    phone:               user.phone,
    createdAt:           user.createdAt.toISOString(),
    balanceCents:        wallet?.balanceCents ?? 0,
    totalDepositedCents: wallet?.totalDeposited ?? 0,
    totalWithdrawnCents: wallet?.totalWithdrawn ?? 0,
    totalWonCents,
    totalBetCents,
  });
});

router.patch('/auth/profile', requireAuth, async (req: AuthRequest, res) => {
  const { username } = req.body as { username?: string };
  if (!username) { res.status(400).json({ error: 'username is required' }); return; }

  const clean = username.trim().replace(/[^a-zA-Z0-9_]/g, '').slice(0, 32);
  if (clean.length < 3) { res.status(400).json({ error: 'Username must be at least 3 characters' }); return; }

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.username, clean));
  if (existing && existing.id !== req.userId) { res.status(409).json({ error: 'Username already taken' }); return; }

  await db.update(users).set({ username: clean, updatedAt: new Date() }).where(eq(users.id, req.userId!));

  res.json({ success: true, username: clean });
});

export default router;
