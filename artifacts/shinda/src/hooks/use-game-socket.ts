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
export const elapsedToMultiplier = (ms: number) => Math.round(Math.exp(ms / K) * 100) / 100;

export function useGameSocket(token: string | null) {
  const [gameState, setGameState] = useState<GameState>({
    id: 0, phase: 'waiting', multiplier: 1.0, crashedAt: null,
    roundId: 0, elapsedMs: 0, playerCount: 0, totalBetsCents: 0, hash: '',
  });
  const [activeBets, setActiveBets] = useState<ActiveBet[]>([]);
  const [connected, setConnected]   = useState(false);
  const [countdown, setCountdown]   = useState<number | null>(null);

  const wsRef              = useRef<WebSocket | null>(null);
  const rafRef             = useRef<number | null>(null);
  const flyStartRef        = useRef<number | null>(null);
  const countdownRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const bettingEndsAtRef   = useRef<number | null>(null);
  // Stable ref so canvas can read multiplier without re-subscribing
  const elapsedRef         = useRef<number>(0);
  const lastStateUpdateRef = useRef<number>(0);

  const startTicker = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    flyStartRef.current = Date.now();
    lastStateUpdateRef.current = 0;

    const tick = () => {
      const now = Date.now();
      const elapsed = now - (flyStartRef.current ?? now);
      elapsedRef.current = elapsed;

      // ⚡ Bolt Optimization: Throttle React state updates during flight phase to ~100ms (~10Hz).
      // High-frequency RAF state updates (60Hz) trigger unnecessary React re-renders across the component tree.
      // Sub-components like GameCanvas perform 60Hz canvas animations using internally calculated elapsed time from flyStartRef.
      if (now - lastStateUpdateRef.current >= 100) {
        lastStateUpdateRef.current = now;
        setGameState(s => ({
          ...s,
          elapsedMs:  elapsed,
          multiplier: elapsedToMultiplier(elapsed),
        }));
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const stopTicker = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    flyStartRef.current = null;
  }, []);

  const startCountdown = useCallback((endsAt: number) => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    bettingEndsAtRef.current = endsAt;
    const update = () => {
      const remaining = Math.max(0, (bettingEndsAtRef.current ?? 0) - Date.now());
      setCountdown(Math.ceil(remaining / 1000));
      if (remaining <= 0 && countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
    update();
    countdownRef.current = setInterval(update, 200);
  }, []);

  const stopCountdown = useCallback(() => {
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    bettingEndsAtRef.current = null;
    setCountdown(null);
  }, []);

  const handleServerEvent = useCallback((type: string, data: unknown) => {
    switch (type) {
      case '1501': {
        const d = data as { id: number; wait_ms?: number };
        stopTicker();
        stopCountdown();
        setActiveBets([]);
        setGameState(s => ({
          ...s, id: d.id, roundId: d.id, phase: 'waiting',
          multiplier: 1.0, crashedAt: null, elapsedMs: 0, playerCount: 0, totalBetsCents: 0,
        }));
        startCountdown(Date.now() + (d.wait_ms ?? 2000) + 5000);
        break;
      }
      case 'betting_open': {
        const d = data as { bettingDurationMs?: number };
        setGameState(s => ({ ...s, phase: 'betting' }));
        startCountdown(Date.now() + (d.bettingDurationMs ?? 5000));
        break;
      }
      case '1502': {
        stopCountdown();
        startTicker();
        setGameState(s => ({ ...s, phase: 'flying', multiplier: 1.0, elapsedMs: 0 }));
        break;
      }
      case '1503': {
        // Server tick — used to correct drift. We already interpolate at 60fps.
        const elapsed = Number(data);
        if (flyStartRef.current) {
          // Correct flyStart based on authoritative server time
          flyStartRef.current = Date.now() - elapsed;
        }
        break;
      }
      case '1504': {
        const d = data as { gameCrash: number; elapsed: number; gameHash: string };
        stopTicker();
        stopCountdown();
        setGameState(s => ({
          ...s, phase: 'crashed', multiplier: d.gameCrash,
          crashedAt: d.gameCrash, elapsedMs: d.elapsed,
        }));
        break;
      }
      case '1507': {
        const d = data as { plays: Array<{ user_id: number; username: string; bet: number }> };
        setActiveBets(prev => {
          const next = [...prev];
          for (const p of d.plays) {
            const idx = next.findIndex(b => b.userId === p.user_id);
            const bet: ActiveBet = {
              userId: p.user_id, username: p.username,
              amountCents: Math.round(p.bet * 100), cashedOutAt: null, autoCashoutAt: null,
            };
            if (idx >= 0) next[idx] = bet; else next.push(bet);
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
          setActiveBets(prev =>
            prev.map(b => b.userId === userId ? { ...b, cashedOutAt: Math.round(mult * 100) } : b)
          );
        }
        break;
      }
      case 'game_state': {
        const d = data as { id: number; state: string; elapsedMs: number; playerCount: number; totalBetsCents: number };
        const phase = d.state as GamePhase;
        setGameState(s => ({
          ...s, id: d.id, roundId: d.id, phase,
          elapsedMs: d.elapsedMs,
          multiplier: phase === 'flying' ? elapsedToMultiplier(d.elapsedMs) : 1.0,
          playerCount: d.playerCount, totalBetsCents: d.totalBetsCents,
        }));
        if (phase === 'flying') {
          flyStartRef.current = Date.now() - d.elapsedMs;
          startTicker();
        }
        break;
      }
    }
  }, [startTicker, stopTicker, startCountdown, stopCountdown]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    const url = token
      ? `${protocol}://${location.host}/ws?token=${encodeURIComponent(token)}`
      : `${protocol}://${location.host}/ws`;
    const ws = new WebSocket(url);
    wsRef.current = ws;
    ws.onopen  = () => setConnected(true);
    ws.onmessage = (e) => {
      try {
        const { type, data } = JSON.parse(e.data) as { type: string; data: unknown };
        handleServerEvent(type, data);
      } catch {}
    };
    ws.onerror = () => {};
    ws.onclose = () => {
      setConnected(false);
      setTimeout(() => connect(), 2000);
    };
  }, [token, handleServerEvent]);

  useEffect(() => {
    connect();
    return () => {
      stopTicker();
      stopCountdown();
      wsRef.current?.close();
    };
  }, [connect]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = useCallback((type: string, data?: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, data }));
    }
  }, []);

  return { gameState, activeBets, connected, send, countdown, flyStartRef, elapsedRef };
}
