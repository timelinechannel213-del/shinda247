import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Rocket, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GameState } from '@/hooks/use-game-socket';

interface GameCanvasProps {
  gameState: GameState;
  countdown?: number | null;
}

export function GameCanvas({ gameState, countdown }: GameCanvasProps) {
  const { phase, multiplier, playerCount, crashedAt } = gameState;
  const isCrashed = phase === 'crashed';
  const isFlying  = phase === 'flying';
  const isBetting = phase === 'betting';
  const isWaiting = phase === 'waiting';

  const stars = useMemo(() =>
    Array.from({ length: 50 }).map((_, i) => ({
      id:       i,
      left:     `${Math.random() * 100}%`,
      top:      `${Math.random() * 100}%`,
      size:     Math.random() * 2 + 1 + 'px',
      delay:    `${Math.random() * 3}s`,
      duration: `${Math.random() * 3 + 2}s`,
    })), []
  );

  const displayMultiplier = isCrashed && crashedAt != null ? crashedAt : multiplier;

  const countdownColor =
    countdown != null && countdown <= 1 ? 'text-destructive' :
    countdown != null && countdown <= 3 ? 'text-warning' :
    'text-white';

  return (
    <div className="relative w-full h-full min-h-[350px] md:min-h-[450px] bg-background rounded-2xl border border-border/50 shadow-2xl overflow-hidden flex flex-col">

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {stars.map(star => (
          <div
            key={star.id}
            className="absolute rounded-full bg-white star"
            style={{
              left:       star.left,
              top:        star.top,
              width:      star.size,
              height:     star.size,
              '--delay':    star.delay,
              '--duration': star.duration,
            } as React.CSSProperties}
          />
        ))}
      </div>

      <div className={cn('absolute bottom-0 left-0 right-0 h-[150px] mountain-bg opacity-40', isFlying && 'moving')} />
      <div className={cn('absolute bottom-0 left-0 right-0 h-[100px] mountain-bg opacity-70', isFlying && 'moving')} style={{ animationDuration: '10s' }} />

      <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
        <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-lg px-3 py-2 flex items-center gap-2">
          <Users className="w-4 h-4 text-success" />
          <div className="flex flex-col">
            <span className="text-[9px] uppercase text-muted-foreground font-bold">Players</span>
            <span className="font-mono text-xs font-bold leading-none">{playerCount}</span>
          </div>
        </div>
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none mt-6">
        <motion.h1
          className={cn(
            'font-mono text-7xl md:text-9xl font-black tracking-tighter drop-shadow-2xl transition-colors duration-300',
            isCrashed ? 'text-destructive' : isFlying ? 'text-white' : 'text-white/50'
          )}
          animate={isFlying ? { scale: [1, 1.02, 1] } : { scale: 1 }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          {displayMultiplier.toFixed(2)}x
        </motion.h1>

        {isCrashed && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 bg-destructive/20 text-destructive border border-destructive/30 px-6 py-2 rounded-full font-display font-bold text-xl uppercase tracking-widest shadow-[0_0_30px_rgba(239,68,68,0.3)]"
          >
            Crashed!
          </motion.div>
        )}

        {(isWaiting || isBetting) && (
          <div className="mt-4 flex flex-col items-center gap-2">
            {countdown != null && countdown > 0 ? (
              <>
                <motion.span
                  key={countdown}
                  initial={{ scale: 1.3, opacity: 0.6 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={cn('font-mono font-black text-6xl md:text-7xl drop-shadow-xl', countdownColor,
                    countdown <= 1 && 'animate-pulse'
                  )}
                >
                  {countdown}s
                </motion.span>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  {isBetting ? 'Betting closes in' : 'Next round in'}
                </span>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-primary font-display font-bold text-xl uppercase tracking-widest flex items-center gap-2"
              >
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                {isBetting ? 'Place Your Bets!' : 'Next Round Soon'}
              </motion.div>
            )}
          </div>
        )}
      </div>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          className="relative mt-48"
          animate={
            isWaiting || isBetting
              ? { y: 100, opacity: 1 }
              : isFlying
              ? {
                  y: [0, -15, 0, -5],
                  x: [-2, 2, -1, 3, -2],
                  rotate: [-1, 2, -1, 1],
                  opacity: 1,
                  transition: { repeat: Infinity, duration: 0.5 },
                }
              : { y: 150, opacity: 0, scale: 0.5, rotate: 45 }
          }
          transition={{ type: 'spring', stiffness: 100 }}
        >
          <div className="relative">
            <Rocket
              className={cn('w-20 h-20 md:w-24 md:h-24', isCrashed ? 'text-destructive' : 'text-white')}
              fill="currentColor"
              strokeWidth={1}
            />
            {isFlying && (
              <motion.div
                className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-6 h-12 bg-gradient-to-b from-primary via-warning to-transparent blur-md rounded-full origin-top"
                animate={{ scaleY: [1, 1.5, 0.8, 1.2], opacity: [0.8, 1, 0.6, 0.9] }}
                transition={{ repeat: Infinity, duration: 0.2 }}
              />
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
