import { Router, type IRouter } from 'express';
import { db } from '@workspace/db';
import { wallets, transactions, bets, games } from '@workspace/db';
import {
  getCurrentGame,
  getActiveBets,
  getRecentGames,
  placeBet,
  processCashout,
} from '@workspace/db';
import { eq, desc } from 'drizzle-orm';
import { requireAuth, optionalAuth, type AuthRequest } from '../middleware/auth';

const router: IRouter = Router();

router.get('/game/state', optionalAuth, async (_req, res) => {
  const game = getCurrentGame();
  if (!game) {
    res.json({ state: 'waiting', id: 0, elapsedMs: 0, playerCount: 0, totalBetsCents: 0 });
    return;
  }
  res.json({
    id:             game.id,
    hash:           game.hash,
    state:          game.state,
    crashPoint:     game.crashPoint,
    elapsedMs:      game.elapsedMs,
    playerCount:    game.playerCount,
    totalBetsCents: game.totalBetsCents,
  });
});

router.get('/game/history', async (req, res) => {
  const limit  = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10)));
  const recent = await getRecentGames(limit);
  res.json(recent.map(g => ({
    id:         g.id,
    hash:       g.hash,
    prevHash:   g.prevHash,
    crashPoint: g.crashPoint,
    elapsedMs:  g.elapsedMs,
    createdAt:  g.createdAt.toISOString(),
  })));
});

router.get('/game/players', optionalAuth, async (_req, res) => {
  const active = getActiveBets();
  res.json(active.map(b => ({
    userId:        b.userId,
    username:      b.username,
    amountCents:   b.amountCents,
    cashedOutAt:   b.cashedOutAt,
    autoCashoutAt: b.autoCashoutAt,
  })));
});

router.post('/game/bet', requireAuth, async (req: AuthRequest, res) => {
  const { amountCents, autoCashoutAt } = req.body as {
    amountCents?: number;
    autoCashoutAt?: number | null;
  };

  if (!amountCents || amountCents <= 0) {
    res.status(400).json({ error: 'amountCents is required and must be positive' });
    return;
  }

  const result = await placeBet(
    req.userId!,
    req.username!,
    Math.round(amountCents),
    autoCashoutAt ?? null
  );

  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }

  const [wallet] = await db
    .select({ balanceCents: wallets.balanceCents })
    .from(wallets)
    .where(eq(wallets.userId, req.userId!));

  res.json({
    success:      true,
    betId:        result.betId,
    balanceCents: wallet?.balanceCents ?? 0,
  });
});

router.post('/game/cashout', requireAuth, async (req: AuthRequest, res) => {
  const game = getCurrentGame();
  if (!game) {
    res.status(400).json({ error: 'No active game' });
    return;
  }

  const result = await processCashout(req.userId!, game.id);

  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }

  const [wallet] = await db
    .select({ balanceCents: wallets.balanceCents })
    .from(wallets)
    .where(eq(wallets.userId, req.userId!));

  res.json({
    success:      true,
    payoutCents:  result.payoutCents,
    balanceCents: wallet?.balanceCents ?? 0,
  });
});

router.get('/players', optionalAuth, async (_req, res) => {
  const active = getActiveBets();
  res.json(active.map(b => ({
    id:          b.userId,
    username:    b.username,
    amount:      b.amountCents / 100,
    multiplier:  b.cashedOutAt !== null ? b.cashedOutAt / 100 : null,
    profit:      b.cashedOutAt !== null ? Math.floor(b.amountCents * b.cashedOutAt / 100 - b.amountCents) / 100 : null,
    cashedOut:   b.cashedOutAt !== null,
    hash:        '',
  })));
});

router.get('/players/leaderboard', optionalAuth, async (_req, res) => {
  const active = getActiveBets();
  const sorted = active
    .filter(b => b.cashedOutAt !== null)
    .sort((a, b) => {
      const profitA = a.amountCents * (a.cashedOutAt ?? 0) / 100 - a.amountCents;
      const profitB = b.amountCents * (b.cashedOutAt ?? 0) / 100 - b.amountCents;
      return profitB - profitA;
    });
  res.json(sorted.map(b => ({
    id:       b.userId,
    username: b.username,
    profit:   Math.floor(b.amountCents * (b.cashedOutAt ?? 0) / 100 - b.amountCents) / 100,
  })));
});

router.get('/wallet', requireAuth, async (req: AuthRequest, res) => {
  const [wallet] = await db
    .select({ balanceCents: wallets.balanceCents, lockedCents: wallets.lockedCents })
    .from(wallets)
    .where(eq(wallets.userId, req.userId!));

  res.json({
    balanceCents: wallet?.balanceCents ?? 0,
    lockedCents:  wallet?.lockedCents ?? 0,
    userId:       req.userId,
    username:     req.username,
  });
});

router.get('/transactions', requireAuth, async (req: AuthRequest, res) => {
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10)));

  const txns = await db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, req.userId!))
    .orderBy(desc(transactions.createdAt))
    .limit(limit);

  res.json(txns);
});

router.get('/game/my-bets', requireAuth, async (req: AuthRequest, res) => {
  const limit  = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '30'), 10)));
  const userId = req.userId!;

  const rows = await db
    .select({
      id:          bets.id,
      gameId:      bets.gameId,
      amountCents: bets.amountCents,
      cashedOutAt: bets.cashedOutAt,
      payoutCents: bets.payoutCents,
      state:       bets.state,
      createdAt:   bets.createdAt,
    })
    .from(bets)
    .where(eq(bets.userId, userId))
    .orderBy(desc(bets.createdAt))
    .limit(limit);

  res.json(rows.map(r => ({
    id:          r.id,
    gameId:      r.gameId,
    amountCents: Number(r.amountCents),
    cashedOutAt: r.cashedOutAt != null ? Number(r.cashedOutAt) : null,
    payoutCents: r.payoutCents != null ? Number(r.payoutCents) : null,
    state:       r.state,
    createdAt:   r.createdAt.toISOString(),
  })));
});

export default router;
