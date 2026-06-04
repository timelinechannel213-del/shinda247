# Shinda 24/7 - Rocket Crash Game

## GitHub Repository

- **Repo**: https://github.com/jairus-cloud/shinda247
- **Auth**: Uses `GITHUB_PERSONAL_ACCESS_TOKEN` secret (stored in Replit secrets)
- **Note**: GitHub was connected via Personal Access Token (not OAuth integration) — future pushes should use the same token approach via the GitHub REST API or git CLI with the token.


## Project

A production-grade real-time rocket crash game inspired by Pakakumi/Shinda 24/7. Dark space-themed gaming interface with live WebSocket multiplier updates, phone/OTP authentication, M-Pesa deposits, provably fair SHA256 hash chain, and 20 bot players.

## Features

- Animated rocket flight with growing multiplier counter
- Four game phases: `waiting` → `betting` → `flying` → `crashed`
- Real-time WebSocket broadcasts (Pakakumi-compatible 1501–1507 messages)
- Provably fair crash point via SHA256 hash chain (players can verify independently)
- Place bet and cash-out with atomic wallet transactions (no race conditions)
- Server-side auto-cashout enforcement
- Post-crash cashout rejection
- Game engine recovery on server restart (refunds in-flight bets)
- Phone/OTP auth with 30-day sessions (token stored in `sessions` table)
- Wallet layer: balances stored in KES cents (integer, no float bugs)
- M-Pesa STK push / Daraja integration (needs env vars — routes return 503 if unconfigured)
- 20 named bot players with realistic bet/cashout behavior
- Full-stack TypeScript monorepo

## Environment Variables Needed

### Required
- `DATABASE_URL` — PostgreSQL connection string (auto-provided by Replit)
- `PORT` — server port (set by workflow: 3001)

### M-Pesa (optional — routes return 503 if not set)
- `MPESA_ENV` — `sandbox` or `production`
- `MPESA_CONSUMER_KEY`
- `MPESA_CONSUMER_SECRET`
- `MPESA_SHORTCODE`
- `MPESA_PASSKEY`
- `MPESA_CALLBACK_URL` — publicly reachable URL for Safaricom callbacks

# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **WebSocket**: `ws` library (server at `/ws`)
- **Frontend**: React + Vite + TailwindCSS
- **Build**: esbuild (API server bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   └── shinda/             # React frontend (Vite)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks (legacy/reference)
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection + game services
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server with WebSocket game server.

- **Entry**: `src/index.ts` — creates HTTP server, attaches WebSocket, starts game engine + bots
- **App**: `src/app.ts` — CORS, JSON parsing, routes at `/api`
- **Routes**:
  - `src/routes/health.ts` — `GET /api/healthz`
  - `src/routes/auth.ts` — `POST /api/auth/request-otp`, `/auth/register`, `/auth/login`, `/auth/logout`, `GET /api/auth/me`
  - `src/routes/game.ts` — `GET /api/game/state`, `/game/history`, `/game/players`, `POST /api/game/bet`, `/game/cashout`, `GET /api/wallet`, `/transactions`, `/players`, `/players/leaderboard`
  - `src/routes/mpesa.ts` — `POST /api/mpesa/stk-push`, `/mpesa/callback`, `GET /api/mpesa/balance`
- **WebSocket** (`src/lib/wsServer.ts`): WS at `/ws?token=<session-token>`. Events: `1501`(new round), `betting_open`, `1502`(flying), `1503`(tick), `1504`(crash), `1505`(cashout), `1507`(bet). Client → server: `{ type: 'bet', data: { amountCents, autoCashoutAt } }` or `{ type: 'cashout' }`.
- **Bots** (`src/lib/bots.ts`): 20 named bots, each betting 4–12 per round with random amounts/cashout timing
- **Auth middleware** (`src/middleware/auth.ts`): `requireAuth` / `optionalAuth` — validates `Authorization: Bearer <token>` header against `sessions` table

### `lib/db` (`@workspace/db`)

Database layer + game services.

- `src/client.ts` — creates `Pool` + Drizzle instance (no circular deps)
- `src/index.ts` — re-exports client + schema + services
- `src/schema/users.ts` — `users`, `otp_codes`, `sessions`
- `src/schema/wallets.ts` — `wallets`, `transactions`, `mpesa_callbacks`
- `src/schema/games.ts` — `games`, `bets` (crash_point stored as integer×100)
- `src/services/rng.service.ts` — `computeCrashPoint()`, `verifyGame()`, `generateHashChain()`, `crashPointToElapsed()`
- `src/services/wallet.service.ts` — atomic `creditWallet()` / `debitWallet()` with SELECT FOR UPDATE
- `src/services/game.engine.ts` — full round lifecycle; `initGameEngine()`, `setBroadcast()`, `placeBet()`, `processCashout()`, `getCurrentGame()`, `getActiveBets()`

**Active DB tables:** `users`, `otp_codes`, `sessions`, `wallets`, `transactions`, `mpesa_callbacks`, `games`, `bets`
**Legacy tables (preserved):** `game_rounds`, `players`

Push schema: `pnpm --filter @workspace/db run push`

### `artifacts/shinda` (`@workspace/shinda`)

React frontend (Vite + TailwindCSS).

- **Auth**: `src/contexts/AuthContext.tsx` — manages token, userId, username, balanceCents in localStorage
- **Auth Modal**: `src/components/auth/auth-modal.tsx` — phone/OTP login & registration flow
- **WS Hook**: `src/hooks/use-game-socket.ts` — connects to `/ws`, maps 1501–1507 events to local `GameState`
- **Game State**: computed from WS events; `elapsedToMultiplier(ms) = exp(ms / 35000)`
- **Proxy**: `/api/*` → `http://localhost:3001` (Vite proxy in `vite.config.ts`)
- Polling removed — everything is real-time via WebSocket

## OTP in Dev Mode

OTPs are logged to console at level `INFO` with format:
```
🔐 OTP (dev mode)  phone: "254..."  code: "123456"
```
No SMS is sent until M-Pesa SMS is integrated.

## Wallet / Balance Convention

All amounts stored as **integer KES cents** — never floats.
- KES 100.00 = 10000 cents
- Minimum bet: 100 cents (KES 1)
- Maximum bet: 300,000 cents (KES 3,000)

## Build / Run

```bash
# Start backend (port 3001)
PORT=3001 pnpm --filter @workspace/api-server run dev

# Start frontend (port 5000)
PORT=5000 BASE_PATH=/ pnpm --filter @workspace/shinda run dev

# Build backend only
pnpm --filter @workspace/api-server run build
```
