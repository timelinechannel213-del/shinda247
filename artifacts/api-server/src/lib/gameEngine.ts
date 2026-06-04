import crypto from "crypto";
import { db } from "@workspace/db";
import { gameRoundsTable, betsTable, playersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { logger } from "./logger";

export type GamePhase = "waiting" | "flying" | "crashed";

interface GameState {
  phase: GamePhase;
  multiplier: number;
  crashedAt: number | null;
  roundId: number;
  countdownMs: number | null;
  onlineCount: number;
  playingCount: number;
  startTime: number | null;
}

interface ActivePlayer {
  id: string;
  username: string;
  amount: number;
  multiplier: number | null;
  profit: number | null;
  cashedOut: boolean;
  hash: string;
}

const WAITING_DURATION_MS = 5000;
const MIN_CRASH = 1.0;

let state: GameState = {
  phase: "waiting",
  multiplier: 1.0,
  crashedAt: null,
  roundId: 0,
  countdownMs: WAITING_DURATION_MS,
  onlineCount: Math.floor(Math.random() * 500) + 800,
  playingCount: 0,
  startTime: null,
};

let activePlayers: Map<string, ActivePlayer> = new Map();
let currentRoundId = 0;
let waitingStartTime = Date.now();
let currentHash = "";
let targetCrashMultiplier = 2.0;

function generateHash(): string {
  return crypto.randomBytes(16).toString("hex");
}

function generateCrashPoint(): number {
  const rand = Math.random();
  if (rand < 0.01) return 1.0;
  const crash = Math.max(MIN_CRASH, (1 / (1 - rand)) * 0.97);
  return Math.round(crash * 100) / 100;
}

function getMultiplierAtTime(ms: number): number {
  const t = ms / 1000;
  return Math.round((1.0024 ** (t * 100)) * 100) / 100;
}

async function startNewRound() {
  currentHash = generateHash();
  targetCrashMultiplier = generateCrashPoint();

  try {
    const [round] = await db.insert(gameRoundsTable).values({
      phase: "waiting",
      hash: currentHash,
      crashedAt: null,
    }).returning();
    currentRoundId = round.id;

    state = {
      phase: "waiting",
      multiplier: 1.0,
      crashedAt: null,
      roundId: currentRoundId,
      countdownMs: WAITING_DURATION_MS,
      onlineCount: Math.floor(Math.random() * 500) + 800,
      playingCount: 0,
      startTime: null,
    };
    activePlayers = new Map();
    waitingStartTime = Date.now();
  } catch (err) {
    logger.error({ err }, "Failed to start new round in DB");
    currentRoundId = Math.floor(Math.random() * 100000);
    state = {
      phase: "waiting",
      multiplier: 1.0,
      crashedAt: null,
      roundId: currentRoundId,
      countdownMs: WAITING_DURATION_MS,
      onlineCount: Math.floor(Math.random() * 500) + 800,
      playingCount: 0,
      startTime: null,
    };
    activePlayers = new Map();
    waitingStartTime = Date.now();
  }

  addSimulatedPlayers();
}

function addSimulatedPlayers() {
  const names = [
    "Peterode", "lagatsa", "Brandd", "Serrias", "yegoro",
    "Johndo", "Ourmae", "kevinge", "mutuah", "njoro",
    "njugun", "angira", "kipyego", "wanjohi", "Kamau"
  ];

  const count = Math.floor(Math.random() * 8) + 5;
  for (let i = 0; i < count; i++) {
    const name = names[Math.floor(Math.random() * names.length)];
    const id = `sim-${name}-${Date.now()}-${i}`;
    const amount = [50, 100, 200, 300, 500, 800, 1000, 1200, 2000, 3000][Math.floor(Math.random() * 10)];
    const cashOutAt = Math.random() > 0.3 ? (Math.random() * 4 + 1.5) : null;
    activePlayers.set(id, {
      id,
      username: name,
      amount,
      multiplier: null,
      profit: null,
      cashedOut: false,
      hash: generateHash(),
    });
  }
}

function tickGame() {
  const now = Date.now();

  if (state.phase === "waiting") {
    const elapsed = now - waitingStartTime;
    const remaining = WAITING_DURATION_MS - elapsed;
    state.countdownMs = Math.max(0, remaining);
    state.playingCount = activePlayers.size;

    if (remaining <= 0) {
      state.phase = "flying";
      state.startTime = now;
      state.countdownMs = null;

      try {
        db.update(gameRoundsTable)
          .set({ phase: "flying", startedAt: new Date() })
          .where(eq(gameRoundsTable.id, currentRoundId))
          .catch(() => {});
      } catch {}
    }
  } else if (state.phase === "flying") {
    const elapsed = now - (state.startTime || now);
    const mult = getMultiplierAtTime(elapsed);
    state.multiplier = mult;
    state.playingCount = activePlayers.size;

    for (const [id, player] of activePlayers) {
      if (!player.cashedOut) {
        // Auto cash-out simulated players at a random point
        if (Math.random() < 0.002 && mult > 1.2) {
          player.cashedOut = true;
          player.multiplier = mult;
          player.profit = Math.round(player.amount * mult - player.amount);
        }
      }
    }

    if (mult >= targetCrashMultiplier) {
      state.phase = "crashed";
      state.crashedAt = targetCrashMultiplier;
      state.multiplier = targetCrashMultiplier;

      try {
        db.update(gameRoundsTable)
          .set({ phase: "crashed", crashedAt: targetCrashMultiplier })
          .where(eq(gameRoundsTable.id, currentRoundId))
          .catch(() => {});
      } catch {}

      setTimeout(() => {
        startNewRound();
      }, 4000);
    }
  }
}

export function getState(): GameState {
  return { ...state };
}

export function getActivePlayers(): ActivePlayer[] {
  return Array.from(activePlayers.values());
}

export async function placeBet(playerId: string, amount: number, autoCashOut?: number | null): Promise<{ betId: number; balance: number }> {
  if (state.phase !== "waiting") {
    throw new Error("Bets can only be placed during the waiting phase");
  }

  let player = await db.query.playersTable.findFirst({
    where: eq(playersTable.id, playerId)
  });

  if (!player) {
    throw new Error("Player not found");
  }

  if (player.balance < amount) {
    throw new Error("Insufficient balance");
  }

  const newBalance = player.balance - amount;
  await db.update(playersTable).set({ balance: newBalance }).where(eq(playersTable.id, playerId));

  const [bet] = await db.insert(betsTable).values({
    roundId: currentRoundId,
    playerId,
    amount,
    autoCashOut: autoCashOut ?? null,
    cashedOut: false,
  }).returning();

  activePlayers.set(playerId, {
    id: playerId,
    username: player.username,
    amount,
    multiplier: null,
    profit: null,
    cashedOut: false,
    hash: generateHash(),
  });

  return { betId: bet.id, balance: newBalance };
}

export async function cashOut(betId: number, playerId: string): Promise<{ profit: number; multiplier: number; balance: number }> {
  if (state.phase !== "flying") {
    throw new Error("Can only cash out during flying phase");
  }

  const bet = await db.query.betsTable.findFirst({
    where: eq(betsTable.id, betId)
  });

  if (!bet || bet.playerId !== playerId) {
    throw new Error("Bet not found");
  }
  if (bet.cashedOut) {
    throw new Error("Already cashed out");
  }

  const mult = state.multiplier;
  const profit = Math.round((bet.amount * mult - bet.amount) * 100) / 100;

  await db.update(betsTable).set({
    cashedOut: true,
    cashOutMultiplier: mult,
    profit,
  }).where(eq(betsTable.id, betId));

  const player = await db.query.playersTable.findFirst({
    where: eq(playersTable.id, playerId)
  });
  const newBalance = (player?.balance ?? 0) + bet.amount + profit;
  await db.update(playersTable).set({ balance: newBalance }).where(eq(playersTable.id, playerId));

  const activePlayer = activePlayers.get(playerId);
  if (activePlayer) {
    activePlayer.cashedOut = true;
    activePlayer.multiplier = mult;
    activePlayer.profit = profit;
  }

  return { profit, multiplier: mult, balance: newBalance };
}

export async function getHistory(limit = 20): Promise<typeof gameRoundsTable.$inferSelect[]> {
  try {
    return await db.select().from(gameRoundsTable)
      .where(eq(gameRoundsTable.phase, "crashed"))
      .orderBy(desc(gameRoundsTable.id))
      .limit(limit);
  } catch {
    return [];
  }
}

export function getLeaderboard() {
  const names = [
    "Peterode", "lagatsa", "Brandd", "Serrias", "yegoro",
    "Johndo", "Ourmae", "Peterdc", "kevinge", "mutuah",
    "njoro.a", "njugun", "angira"
  ];
  return names.map(n => ({
    username: n,
    multiplier: Math.round((Math.random() * 10 + 1.5) * 10) / 10,
    amount: [550, 700, 800, 1200, 1370, 1600, 3000, 4000, 4250][Math.floor(Math.random() * 9)],
  }));
}

startNewRound();
setInterval(tickGame, 100);
