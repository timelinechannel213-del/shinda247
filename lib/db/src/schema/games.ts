import { pgTable, serial, integer, bigint, varchar, timestamp, pgEnum, boolean, real, text, index, unique } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { users } from './users';

export const gameStateEnum = pgEnum('game_state', [
  'waiting',  // Waiting for next round to start
  'betting',  // Betting phase — players can place bets
  'flying',   // Multiplier is rising — players can cashout
  'crashed',  // Game has crashed — round over
]);

export const games = pgTable('games', {
  id:          serial('id').primaryKey(),
  // Provably fair fields
  hash:        varchar('hash', { length: 64 }).notNull().unique(),  // SHA256 published after round
  prevHash:    varchar('prev_hash', { length: 64 }),                // Links to previous game — chain
  // crash_point stored as integer x100 to avoid float issues
  // e.g. 1.60x = 160, 4.06x = 406, 77.58x = 7758
  crashPoint:  integer('crash_point'),                              // null until crashed
  state:       gameStateEnum('state').notNull().default('waiting'),
  // Timing
  bettingOpenAt:  timestamp('betting_open_at'),
  bettingCloseAt: timestamp('betting_close_at'),
  flyingStartAt:  timestamp('flying_start_at'),
  crashedAt:      timestamp('crashed_at'),
  elapsedMs:      integer('elapsed_ms'),                            // Total flight duration
  // Stats
  totalBetsCents:  bigint('total_bets_cents', { mode: 'number' }).notNull().default(0),
  totalPayoutCents: bigint('total_payout_cents', { mode: 'number' }).notNull().default(0),
  playerCount:     integer('player_count').notNull().default(0),
  forced:          boolean('forced').notNull().default(false),      // Was crash forced by server
  createdAt:       timestamp('created_at').notNull().defaultNow(),
});

export const betStateEnum = pgEnum('bet_state', [
  'active',    // Bet placed, game still flying
  'cashed_out', // Player cashed out successfully
  'lost',      // Game crashed before cashout
  'refunded',  // Bet returned (game error, etc.)
]);

export const bets = pgTable('bets', {
  id:          serial('id').primaryKey(),
  gameId:      integer('game_id').notNull().references(() => games.id),
  userId:      integer('user_id').notNull().references(() => users.id),
  // Amount in KES cents
  amountCents: bigint('amount_cents', { mode: 'number' }).notNull(),
  state:       betStateEnum('state').notNull().default('active'),
  // Auto cashout — set by player before game starts, null = manual
  autoCashoutAt: integer('auto_cashout_at'),   // x100 e.g. 200 = 2.00x
  // Cashout result
  cashedOutAt:      integer('cashed_out_at'),   // Multiplier x100 at cashout
  cashedOutTime:    timestamp('cashed_out_time'), // Server timestamp — used for validation
  payoutCents:      bigint('payout_cents', { mode: 'number' }),
  // idx for position in bet list (used in live feed ordering)
  xid:         integer('xid'),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  // Prevent duplicate bets per player per game
  uniquePlayerGame: unique('unique_player_game').on(table.gameId, table.userId),
  // Fast lookup by game
  gameIdIdx: index('bets_game_id_idx').on(table.gameId),
  // Fast lookup by user
  userIdIdx: index('bets_user_id_idx').on(table.userId),
}));

export const insertGameSchema = createInsertSchema(games);
export const selectGameSchema = createSelectSchema(games);
export const insertBetSchema  = createInsertSchema(bets);
export const selectBetSchema  = createSelectSchema(bets);
