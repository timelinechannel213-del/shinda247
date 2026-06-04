import { Router, type IRouter } from 'express';
import { randomBytes } from 'crypto';
import { db } from '@workspace/db';
import { users, otpCodes, sessions, wallets } from '@workspace/db';
import { eq, and, lt, gt } from 'drizzle-orm';
import { logger } from '../lib/logger';

const router: IRouter = Router();

function generateOtp(): string {
  return String(Math.floor(100_000 + Math.random() * 900_000));
}

function generateToken(): string {
  return randomBytes(48).toString('hex');
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length === 10) return '254' + digits.slice(1);
  if (digits.startsWith('254') && digits.length === 12) return digits;
  if (digits.startsWith('7') && digits.length === 9) return '254' + digits;
  return digits;
}

router.post('/auth/request-otp', async (req, res) => {
  const { phone } = req.body as { phone?: string };

  if (!phone) {
    res.status(400).json({ error: 'phone is required' });
    return;
  }

  const normalized = normalizePhone(phone);
  if (normalized.length !== 12) {
    res.status(400).json({ error: 'Invalid phone number. Use format: 254XXXXXXXXX' });
    return;
  }

  const code      = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await db.delete(otpCodes).where(eq(otpCodes.phone, normalized));

  await db.insert(otpCodes).values({ phone: normalized, code, expiresAt });

  if (process.env.NODE_ENV !== 'production') {
    logger.info({ phone: normalized, code }, '🔐 OTP (dev mode)');
  }

  res.json({ success: true, message: 'OTP sent to your phone' });
});

router.post('/auth/register', async (req, res) => {
  const { phone, username, otp } = req.body as { phone?: string; username?: string; otp?: string };

  if (!phone || !username || !otp) {
    res.status(400).json({ error: 'phone, username, and otp are required' });
    return;
  }

  const normalized = normalizePhone(phone);

  const [otpRecord] = await db
    .select()
    .from(otpCodes)
    .where(and(eq(otpCodes.phone, normalized), gt(otpCodes.expiresAt, new Date())));

  if (!otpRecord) {
    res.status(400).json({ error: 'OTP expired or not found. Request a new one.' });
    return;
  }

  if (otpRecord.attempts >= 3) {
    res.status(429).json({ error: 'Too many attempts. Request a new OTP.' });
    return;
  }

  if (otpRecord.code !== otp) {
    await db.update(otpCodes)
      .set({ attempts: otpRecord.attempts + 1 })
      .where(eq(otpCodes.id, otpRecord.id));
    res.status(400).json({ error: 'Invalid OTP' });
    return;
  }

  const cleanUsername = username.trim().replace(/[^a-zA-Z0-9_]/g, '').slice(0, 32);
  if (cleanUsername.length < 3) {
    res.status(400).json({ error: 'Username must be at least 3 alphanumeric characters' });
    return;
  }

  const [existingPhone] = await db.select().from(users).where(eq(users.phone, normalized));
  if (existingPhone) {
    res.status(409).json({ error: 'Phone number already registered' });
    return;
  }

  const [existingUser] = await db.select().from(users).where(eq(users.username, cleanUsername));
  if (existingUser) {
    res.status(409).json({ error: 'Username already taken' });
    return;
  }

  const [user] = await db.insert(users).values({
    phone: normalized,
    username: cleanUsername,
    isActive: true,
  }).returning({ id: users.id, username: users.username });

  await db.insert(wallets).values({
    userId:       user.id,
    balanceCents: 0,
  });

  await db.delete(otpCodes).where(eq(otpCodes.phone, normalized));

  const token     = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ userId: user.id, token, expiresAt });

  logger.info({ userId: user.id, username: user.username }, 'User registered');

  res.json({ success: true, token, userId: user.id, username: user.username });
});

router.post('/auth/login', async (req, res) => {
  const { phone, otp } = req.body as { phone?: string; otp?: string };

  if (!phone || !otp) {
    res.status(400).json({ error: 'phone and otp are required' });
    return;
  }

  const normalized = normalizePhone(phone);

  const [otpRecord] = await db
    .select()
    .from(otpCodes)
    .where(and(eq(otpCodes.phone, normalized), gt(otpCodes.expiresAt, new Date())));

  if (!otpRecord) {
    res.status(400).json({ error: 'OTP expired or not found. Request a new one.' });
    return;
  }

  if (otpRecord.attempts >= 3) {
    res.status(429).json({ error: 'Too many attempts. Request a new OTP.' });
    return;
  }

  if (otpRecord.code !== otp) {
    await db.update(otpCodes)
      .set({ attempts: otpRecord.attempts + 1 })
      .where(eq(otpCodes.id, otpRecord.id));
    res.status(400).json({ error: 'Invalid OTP' });
    return;
  }

  const [user] = await db
    .select({ id: users.id, username: users.username, isActive: users.isActive })
    .from(users)
    .where(eq(users.phone, normalized));

  if (!user) {
    res.status(404).json({ error: 'Phone not registered. Please register first.' });
    return;
  }

  if (!user.isActive) {
    res.status(403).json({ error: 'Account deactivated' });
    return;
  }

  await db.delete(otpCodes).where(eq(otpCodes.phone, normalized));

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
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const token = authHeader.slice(7);
  const [session] = await db
    .select({ userId: sessions.userId })
    .from(sessions)
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())));

  if (!session) {
    res.status(401).json({ error: 'Session expired' });
    return;
  }

  const [user] = await db
    .select({ id: users.id, username: users.username, phone: users.phone, isAdmin: users.isAdmin })
    .from(users)
    .where(eq(users.id, session.userId));

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

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

export default router;
