import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { db } from '@workspace/db';
import { sessions, users } from '@workspace/db';
import { eq, and, gt } from 'drizzle-orm';
import { logger } from './logger';
import {
  getCurrentGame,
  placeBet,
  processCashout,
  type GameState,
} from '@workspace/db';

interface Client extends WebSocket {
  userId?: number;
  username?: string;
  isAlive: boolean;
}

let wss: WebSocketServer | null = null;

export function createWsServer(server: Server): WebSocketServer {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', async (ws: Client, req) => {
    ws.isAlive = true;

    const url = new URL(req.url ?? '/', 'http://localhost');
    const token = url.searchParams.get('token');

    if (token) {
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
            ws.userId   = user.id;
            ws.username = user.username;

            send(ws, 'auth_ok', { userId: user.id, username: user.username });
          }
        }
      } catch (err) {
        logger.error({ err }, 'WS auth error');
      }
    }

    const game = getCurrentGame();
    if (game) {
      send(ws, 'game_state', {
        id:             game.id,
        state:          game.state,
        elapsedMs:      game.elapsedMs,
        playerCount:    game.playerCount,
        totalBetsCents: game.totalBetsCents,
      });
    }

    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', async (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as { type: string; data?: Record<string, unknown> };
        await handleMessage(ws, msg);
      } catch (err) {
        send(ws, 'error', { message: 'Invalid message format' });
      }
    });

    ws.on('error', (err) => logger.error({ err }, 'WS client error'));
    ws.on('close', () => {
      logger.debug({ userId: ws.userId }, 'WS client disconnected');
    });
  });

  const heartbeat = setInterval(() => {
    wss?.clients.forEach((client) => {
      const ws = client as Client;
      if (!ws.isAlive) { ws.terminate(); return; }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30_000);

  wss.on('close', () => clearInterval(heartbeat));

  logger.info('WebSocket server ready at /ws');
  return wss;
}

async function handleMessage(ws: Client, msg: { type: string; data?: Record<string, unknown> }) {
  switch (msg.type) {
    case 'bet': {
      if (!ws.userId || !ws.username) {
        send(ws, 'error', { message: 'Authentication required' });
        return;
      }
      const amountCents   = Number(msg.data?.amountCents ?? 0);
      const autoCashoutAt = msg.data?.autoCashoutAt != null ? Number(msg.data.autoCashoutAt) : null;

      const result = await placeBet(ws.userId, ws.username, amountCents, autoCashoutAt);
      if (result.success) {
        send(ws, 'bet_ok', { betId: result.betId });
      } else {
        send(ws, 'error', { message: result.error });
      }
      break;
    }

    case 'cashout': {
      if (!ws.userId) {
        send(ws, 'error', { message: 'Authentication required' });
        return;
      }
      const game = getCurrentGame();
      if (!game) {
        send(ws, 'error', { message: 'No active game' });
        return;
      }
      const result = await processCashout(ws.userId, game.id);
      if (result.success) {
        send(ws, 'cashout_ok', { payoutCents: result.payoutCents });
      } else {
        send(ws, 'error', { message: result.error });
      }
      break;
    }

    default:
      send(ws, 'error', { message: `Unknown message type: ${msg.type}` });
  }
}

function send(ws: WebSocket, type: string, data: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, data }));
  }
}

export function broadcast(event: string, data: unknown) {
  if (!wss) return;
  const payload = JSON.stringify({ type: event, data });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

export function getConnectedCount(): number {
  return wss?.clients.size ?? 0;
}
