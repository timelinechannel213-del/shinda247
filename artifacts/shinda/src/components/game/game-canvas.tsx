import { useEffect, useRef, useCallback, useMemo, useState, useLayoutEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { GameState } from '@/hooks/use-game-socket';

const K = 35_000;
const exp = (ms: number) => Math.exp(ms / K);

interface WinFlash {
  payoutCents: number;
  multiplier: number;
}

interface GameCanvasProps {
  gameState: GameState;
  countdown?: number | null;
  winFlash?: WinFlash | null;
  flyStartRef?: React.RefObject<number | null>;
}

export function GameCanvas({ gameState, countdown, winFlash, flyStartRef }: GameCanvasProps) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pointsRef    = useRef<Array<{ t: number; m: number }>>([]);
  const rafRef       = useRef<number | null>(null);

  // Direct DOM refs for high-frequency updates without React re-renders
  const multiplierRef = useRef<HTMLSpanElement>(null);
  const rocketRef     = useRef<HTMLDivElement>(null);
  const flameRef      = useRef<HTMLDivElement>(null);

  const [flashVisible, setFlashVisible] = useState(false);

  const { phase, multiplier, crashedAt } = gameState;
  const isCrashed = phase === 'crashed';
  const isFlying  = phase === 'flying';
  const isBetting = phase === 'betting';
  const isWaiting = phase === 'waiting';

  useEffect(() => {
    if (!winFlash) return;
    setFlashVisible(true);
    const t = setTimeout(() => setFlashVisible(false), 1400);
    return () => clearTimeout(t);
  }, [winFlash]);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W   = canvas.width;
    const H   = canvas.height;
    const pts = pointsRef.current;

    ctx.clearRect(0, 0, W, H);
    if (pts.length < 2) return;

    const lastPt = pts[pts.length - 1];
    const maxT   = Math.max(lastPt.t * 1.15, 6000);
    const maxM   = Math.max(lastPt.m * 1.35, 2.0);

    const pad = { l: 10, r: 20, t: 50, b: 30 };
    const plotW = W - pad.l - pad.r;
    const plotH = H - pad.t - pad.b;

    const toX = (t: number) => pad.l + (t / maxT) * plotW;
    const toY = (m: number) => H - pad.b - ((m - 1) / (maxM - 1)) * plotH;

    // Filled area under curve
    ctx.beginPath();
    ctx.moveTo(toX(pts[0].t), toY(pts[0].m));
    for (const pt of pts) ctx.lineTo(toX(pt.t), toY(pt.m));
    ctx.lineTo(toX(lastPt.t), H - pad.b);
    ctx.lineTo(toX(pts[0].t), H - pad.b);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, H - pad.b, 0, pad.t);
    grad.addColorStop(0, 'rgba(255,107,0,0.0)');
    grad.addColorStop(1, 'rgba(255,107,0,0.15)');
    ctx.fillStyle = grad;
    ctx.fill();

    // Glow layers
    const lineColor = isCrashed ? '#ef4444' : '#ff6b00';
    const glowColor = isCrashed ? 'rgba(239,68,68,' : 'rgba(255,107,0,';
    [[10, `${glowColor}0.08)`], [5, `${glowColor}0.25)`], [2.5, lineColor]].forEach(([lw, color]) => {
      ctx.beginPath();
      ctx.moveTo(toX(pts[0].t), toY(pts[0].m));
      for (const pt of pts) ctx.lineTo(toX(pt.t), toY(pt.m));
      ctx.strokeStyle = color as string;
      ctx.lineWidth   = lw as number;
      ctx.lineJoin    = 'round';
      ctx.lineCap     = 'round';
      ctx.stroke();
    });

    // Rocket position — angle = direction of curve tip.
    // Update rocket style directly via refs to avoid state trigger and 60fps re-renders.
    const rx = toX(lastPt.t);
    const ry = toY(lastPt.m);
    let angle = -45;
    if (pts.length >= 5) {
      const prev = pts[pts.length - 5];
      const dx = toX(lastPt.t) - toX(prev.t);
      const dy = toY(lastPt.m) - toY(prev.m);
      angle = Math.atan2(dy, dx) * (180 / Math.PI);
    }

    if (rocketRef.current) {
      rocketRef.current.style.left = `${rx - 18}px`;
      rocketRef.current.style.top = `${ry - 18}px`;
      rocketRef.current.style.transform = `rotate(${angle + 90}deg)`;
    }
  }, [isCrashed]);

  // Synchronize visual DOM elements immediately after render to prevent snapping/flickering
  useLayoutEffect(() => {
    const start = flyStartRef?.current;
    if (phase === 'flying' && start != null) {
      const elapsed = Date.now() - start;
      const m = exp(elapsed);
      if (multiplierRef.current) {
        multiplierRef.current.textContent = `${m.toFixed(2)}x`;
      }
      if (rocketRef.current) {
        rocketRef.current.style.display = 'block';
        rocketRef.current.style.filter = 'drop-shadow(0 0 8px rgba(255,107,0,0.8))';
      }
      if (flameRef.current) {
        flameRef.current.style.display = 'block';
      }

      // Pre-fill points for canvas line drawing up to current elapsed
      pointsRef.current = [];
      const step = 16;
      for (let t = 0; t <= elapsed; t += step) {
        pointsRef.current.push({ t, m: exp(t) });
      }
      pointsRef.current.push({ t: elapsed, m });
      drawFrame();
    } else if (phase === 'crashed') {
      const displayM = crashedAt ?? multiplier;
      if (multiplierRef.current) {
        multiplierRef.current.textContent = `${displayM.toFixed(2)}x`;
      }
      if (rocketRef.current) {
        rocketRef.current.style.display = 'block';
        rocketRef.current.style.filter = 'grayscale(1) opacity(0.4)';
      }
      if (flameRef.current) {
        flameRef.current.style.display = 'none';
      }
      drawFrame();
    } else {
      if (multiplierRef.current) {
        multiplierRef.current.textContent = `${multiplier.toFixed(2)}x`;
      }
      if (rocketRef.current) {
        rocketRef.current.style.display = 'none';
        rocketRef.current.style.left = '-100px';
        rocketRef.current.style.top = '-100px';
      }
      if (flameRef.current) {
        flameRef.current.style.display = 'none';
      }
    }
  }, [phase, multiplier, crashedAt, drawFrame, flyStartRef]);

  // Flying phase — RAF loop
  useEffect(() => {
    if (phase !== 'flying') {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      if (phase === 'waiting' || phase === 'betting') {
        pointsRef.current = [];
        const canvas = canvasRef.current;
        if (canvas) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    pointsRef.current = [];
    const start = flyStartRef?.current ?? Date.now();

    const tick = () => {
      const currentStart = flyStartRef?.current ?? start;
      const elapsed = Date.now() - currentStart;
      const m = exp(elapsed);
      pointsRef.current.push({ t: elapsed, m });
      if (pointsRef.current.length > 3000) pointsRef.current.shift();

      // Draw canvas & update rocket position/rotation via DOM ref in drawFrame
      drawFrame();

      // Update multiplier text directly via DOM ref to avoid 60fps React state re-renders
      if (multiplierRef.current) {
        multiplierRef.current.textContent = `${m.toFixed(2)}x`;
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    };
  }, [phase, drawFrame, flyStartRef]);

  // Resize canvas to match container
  useEffect(() => {
    const container = containerRef.current;
    const canvas    = canvasRef.current;
    if (!container || !canvas) return;
    const resize = () => {
      const r = container.getBoundingClientRect();
      canvas.width  = r.width;
      canvas.height = r.height;
      drawFrame();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    return () => ro.disconnect();
  }, [drawFrame]);

  const countdownColor =
    countdown != null && countdown <= 1 ? 'text-destructive' :
    countdown != null && countdown <= 3 ? 'text-yellow-400' :
    'text-white';

  // Deterministic stars
  const stars = useMemo(() =>
    Array.from({ length: 55 }).map((_, i) => ({
      left:     `${(i * 17.31 + 3) % 100}%`,
      top:      `${(i * 23.71 + 7) % 100}%`,
      size:     (i % 3) + 1,
      opacity:  0.3 + (i % 5) * 0.1,
      delay:    `${(i * 0.37) % 3}s`,
      duration: `${2 + (i * 0.23) % 3}s`,
    })), []
  );

  return (
    <div
      ref={containerRef}
      className="relative w-full min-h-[360px] md:min-h-[460px] bg-[#060612] rounded-2xl border border-border/50 shadow-2xl overflow-hidden"
    >
      {/* Stars */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {stars.map((s, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white star"
            style={{
              left: s.left, top: s.top,
              width: `${s.size}px`, height: `${s.size}px`,
              opacity: s.opacity,
              '--delay': s.delay, '--duration': s.duration,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Exponential curve */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      {/* Rocket emoji at curve tip */}
      <div
        ref={rocketRef}
        className="absolute pointer-events-none select-none transition-filter duration-300"
        style={{
          display:     (isFlying || isCrashed) ? 'block' : 'none',
          left:        '-100px',
          top:         '-100px',
          fontSize:    '32px',
          lineHeight:  1,
          transform:   'rotate(45deg)',
          filter:      isCrashed ? 'grayscale(1) opacity(0.4)' : 'drop-shadow(0 0 8px rgba(255,107,0,0.8))',
        }}
      >
        🚀
        <div
          ref={flameRef}
          className="absolute top-full left-1/2 -translate-x-1/2 w-4 h-6 rounded-full animate-pulse"
          style={{
            display: isFlying ? 'block' : 'none',
            background: 'linear-gradient(to bottom, #ff6b00, #ffcc00, transparent)',
            filter: 'blur(3px)',
            transform: `translateX(-50%) rotate(180deg)`,
          }}
        />
      </div>

      {/* Central display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span
          ref={multiplierRef}
          className={cn(
            'font-mono font-black tracking-tighter select-none drop-shadow-2xl transition-all duration-300',
            isCrashed ? 'text-destructive text-7xl md:text-9xl' :
            isFlying  ? 'text-white text-6xl md:text-8xl' :
                        'text-white/30 text-5xl md:text-7xl'
          )}
          style={isFlying ? { textShadow: '0 0 20px rgba(255,255,255,0.3)' } : {}}
        >
          {((phase === 'crashed' && crashedAt != null) ? crashedAt : multiplier).toFixed(2)}x
        </span>

        {isCrashed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-3 bg-destructive/20 text-destructive border border-destructive/40 px-6 py-2 rounded-full font-display font-bold text-lg uppercase tracking-widest shadow-[0_0_40px_rgba(239,68,68,0.4)]"
          >
            CRASHED!
          </motion.div>
        )}

        {(isWaiting || isBetting) && (
          <div className="mt-4 flex flex-col items-center gap-2">
            {countdown != null && countdown > 0 ? (
              <>
                <motion.span
                  key={countdown}
                  initial={{ scale: 1.4, opacity: 0.5 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={cn('font-mono font-black text-6xl drop-shadow-xl', countdownColor, countdown <= 1 && 'animate-pulse')}
                >
                  {countdown}s
                </motion.span>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  {isBetting ? 'Betting closes in' : 'Next round in'}
                </span>
              </>
            ) : (
              <div className="text-primary font-display font-bold text-lg uppercase tracking-widest flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                {isBetting ? 'Place Your Bets!' : 'Next Round Soon'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cashout win flash */}
      {flashVisible && winFlash && (
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl pointer-events-none z-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ duration: 1.4, times: [0, 0.08, 0.65, 1] }}
          style={{ background: 'radial-gradient(ellipse at center, rgba(34,197,94,0.5) 0%, rgba(34,197,94,0.03) 70%)' }}
        >
          <motion.div
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.04, type: 'spring', stiffness: 350, damping: 20 }}
            className="flex flex-col items-center gap-2 bg-black/30 backdrop-blur-sm px-8 py-5 rounded-2xl border border-success/40"
          >
            <span className="text-success font-black text-2xl uppercase tracking-widest">WIN! ✅</span>
            <span className="font-mono font-black text-5xl text-success drop-shadow-lg leading-tight">
              +KES {(winFlash.payoutCents / 100).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-success/80 font-bold text-xl">at {winFlash.multiplier.toFixed(2)}x</span>
          </motion.div>
        </motion.div>
      )}

      {/* Ground line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent pointer-events-none" />
    </div>
  );
}
