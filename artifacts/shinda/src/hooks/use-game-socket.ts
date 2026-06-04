import { useState, useEffect, useRef, useCallback } from 'react';

export type GamePhase = 'waiting' | 'betting' | 'flying' | 'crashed';

export interface GameState {
  id: number;
  phase: GamePhase;
  multiplier: number;
  crashedAt: number | null;
  roundId: number;
  elapsedMs: number;
  playerCount: number;
  totalBetsCents: number;
  hash: string;
}

export interface ActiveBet {
  userId: number;
  username: string;
  amountCents: number;
  cashedOutAt: number | null;
  autoCashoutAt: number | null;
}

const K = 35_000;
const elapsedToMultiplier = (ms: number) => Math.round(Math.exp(ms / K) * 100) / 100;

export function useGameSocket(token: string | null) {
  const [gameState, setGameState] = useState<GameState>({
    id:             0,
    phase:          'waiting',
    multiplier:     1.0,
    crashedAt:      null,
    roundId:        0,
    elapsedMs:      0,
    playerCount:    0,
    totalBetsCents: 0,
    hash:           '',
  });
  const [activeBets, setActiveBets]   = useState<ActiveBet[]>([]);
  const [connected, setConnected]     = useState(false);

  const wsRef       = useRef<WebSocket | null>(null);
  const tickRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const flyStartRef = useRef<number | null>(null);

  const startTicker = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    flyStartRef.current = Date.now();
    tickRef.current = setInterval(() => {
      const elapsed = Date.now() - (flyStartRef.current ?? Date.now());
      setGameState(s => ({
        ...s,
        elapsedMs:  elapsed,
        multiplier: elapsedToMultiplier(elapsed),
      }));
    }, 100);
  }, []);

  const stopTicker = useCallback(() => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    flyStartRef.current = null;
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    const url      = token
      ? `${protocol}://${location.host}/ws?token=${encodeURIComponent(token)}`
      : `${protocol}://${location.host}/ws`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);

    ws.onmessage = (e) => {
      try {
        const { type, data } = JSON.parse(e.data) as { type: string; data: unknown };
        handleServerEvent(type, data);
      } catch {}
    };

    ws.onerror   = () => {};
    ws.onclose   = () => {
      setConnected(false);
      setTimeout(() => connect(), 2000);
    };
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleServerEvent = useCallback((type: string, data: unknown) => {
    switch (type) {
      case '1501': {
        const d = data as { id: number; wait_ms?: number };
        stopTicker();
        setActiveBets([]);
        setGameState(s => ({
          ...s,
          id:         d.id,
          roundId:    d.id,
          phase:      'waiting',
          multiplier: 1.0,
          crashedAt:  null,
          elapsedMs:  0,
          playerCount: 0,
          totalBetsCents: 0,
        }));
        break;
      }

      case 'betting_open': {
        setGameState(s => ({ ...s, phase: 'betting' }));
        break;
      }

      case '1502': {
        startTicker();
        setGameState(s => ({ ...s, phase: 'flying', multiplier: 1.0, elapsedMs: 0 }));
        break;
      }

      case '1503': {
        const elapsed = Number(data);
        setGameState(s => ({
          ...s,
          elapsedMs:  elapsed,
          multiplier: elapsedToMultiplier(elapsed),
        }));
        break;
      }

      case '1504': {
        const d = data as { gameCrash: number; elapsed: number; gameHash: string };
        stopTicker();
        setGameState(s => ({
          ...s,
          phase:     'crashed',
          multiplier: d.gameCrash,
          crashedAt:  d.gameCrash,
          elapsedMs:  d.elapsed,
        }));
        break;
      }

      case '1507': {
        const d = data as { plays: Array<{ user_id: number; username: string; bet: number }> };
        setActiveBets(prev => {
          const next = [...prev];
          for (const p of d.plays) {
            const existing = next.findIndex(b => b.userId === p.user_id);
            const bet: ActiveBet = {
              userId:        p.user_id,
              username:      p.username,
              amountCents:   Math.round(p.bet * 100),
              cashedOutAt:   null,
              autoCashoutAt: null,
            };
            if (existing >= 0) next[existing] = bet;
            else next.push(bet);
          }
          return next;
        });
        setGameState(s => ({ ...s, playerCount: s.playerCount + d.plays.length }));
        break;
      }

      case '1505': {
        const d = data as Record<string, unknown>;
        for (const key of Object.keys(d)) {
          if (key === '0') continue;
          const userId = parseInt(key, 10);
          const inner  = d[key] as Record<string, number>;
          const mult   = Object.values(inner)[0] ?? 0;
          setActiveBets(prev => prev.map(b =>
            b.userId === userId ? { ...b, cashedOutAt: Math.round(mult * 100) } : b
          ));
        }
        break;
      }

      case 'game_state': {
        const d = data as {
          id: number; state: string; elapsedMs: number;
          playerCount: number; totalBetsCents: number;
        };
        const phase = d.state as GamePhase;
        setGameState(s => ({
          ...s,
          id:             d.id,
          roundId:        d.id,
          phase,
          elapsedMs:      d.elapsedMs,
          multiplier:     phase === 'flying' ? elapsedToMultiplier(d.elapsedMs) : 1.0,
          playerCount:    d.playerCount,
          totalBetsCents: d.totalBetsCents,
        }));
        if (phase === 'flying') {
          flyStartRef.current = Date.now() - d.elapsedMs;
          startTicker();
        }
        break;
      }
    }
  }, [startTicker, stopTicker]);

  useEffect(() => {
    connect();
    return () => {
      stopTicker();
      wsRef.current?.close();
    };
  }, [connect]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = useCallback((type: string, data?: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, data }));
    }
  }, []);

  return { gameState, activeBets, connected, send };
}
