import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Button }   from '@/components/ui/button';
import { Input }    from '@/components/ui/input';
import { Hash, Settings2, Wifi, WifiOff } from 'lucide-react';
import { useAuth }  from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { elapsedToMultiplier } from '@/hooks/use-game-socket';
import type { GameState, ActiveBet } from '@/hooks/use-game-socket';

interface WinFlash {
  payoutCents: number;
  multiplier: number;
}

interface GameControlsProps {
  gameState:   GameState;
  activeBets:  ActiveBet[];
  connected:   boolean;
  send:        (type: string, data?: unknown) => void;
  onWin?:      (flash: WinFlash) => void;
  flyStartRef?: React.RefObject<number | null> | React.MutableRefObject<number | null>;
}

export function GameControls({ gameState, activeBets, connected, send, onWin, flyStartRef }: GameControlsProps) {
  const { token, userId, refreshBalance } = useAuth();
  const { toast } = useToast();

  const [amount, setAmount]     = useState<string>('500');
  const [autoCash, setAutoCash] = useState<string>('4.3');
  const [pending, setPending]   = useState(false);

  const prevRoundId = useRef<number>(0);
  const controlsRafRef = useRef<number | null>(null);
  const cashoutTextRef = useRef<HTMLSpanElement>(null);

  const { phase, multiplier, id } = gameState;

  const myBet    = userId != null ? activeBets.find(b => b.userId === userId) : null;
  const hasBet   = !!myBet;
  const cashedOut = myBet?.cashedOutAt !== null && myBet?.cashedOutAt !== undefined;
  const canBet    = !hasBet && (phase === 'waiting' || phase === 'betting') && connected;
  const canCashOut = hasBet && !cashedOut && phase === 'flying';

  useEffect(() => {
    if (id !== prevRoundId.current && phase === 'waiting') {
      prevRoundId.current = id;
    }
  }, [id, phase]);

  const handleBet = async () => {
    if (!token) { toast({ title: 'Login required', variant: 'destructive' }); return; }
    const amountCents   = Math.round(parseFloat(amount) * 100);
    const autoCashoutAt = parseFloat(autoCash) > 0 ? Math.round(parseFloat(autoCash) * 100) : null;

    if (amountCents < 100) { toast({ title: 'Minimum bet is KES 1', variant: 'destructive' }); return; }

    setPending(true);
    try {
      const res  = await fetch('/api/game/bet', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ amountCents, autoCashoutAt }),
      });
      const data = await res.json();
      if (!res.ok) { toast({ title: data.error ?? 'Bet failed', variant: 'destructive' }); return; }
      toast({ title: 'Bet placed!', description: `KES ${amount}` });
      refreshBalance();
    } catch {
      toast({ title: 'Network error', variant: 'destructive' });
    } finally {
      setPending(false);
    }
  };

  const handleCashOut = async () => {
    if (!token) return;
    const elapsed = flyStartRef && flyStartRef.current ? Date.now() - flyStartRef.current : 0;
    const cashoutMultiplier = elapsedToMultiplier(elapsed);
    setPending(true);
    try {
      const res  = await fetch('/api/game/cashout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) { toast({ title: data.error ?? 'Cashout failed', variant: 'destructive' }); return; }
      onWin?.({ payoutCents: data.payoutCents, multiplier: cashoutMultiplier });
      toast({
        title:       '🎉 Cashed Out!',
        description: `Won KES ${(data.payoutCents / 100).toFixed(2)} at ${cashoutMultiplier.toFixed(2)}x`,
      });
      refreshBalance();
    } catch {
      toast({ title: 'Network error', variant: 'destructive' });
    } finally {
      setPending(false);
    }
  };

  // High-frequency manual loop for cashout multiplier updates
  useEffect(() => {
    if (phase !== 'flying' || !canCashOut) {
      if (controlsRafRef.current) {
        cancelAnimationFrame(controlsRafRef.current);
        controlsRafRef.current = null;
      }
      return;
    }

    const tick = () => {
      if (flyStartRef && flyStartRef.current && cashoutTextRef.current) {
        const elapsed = Date.now() - flyStartRef.current;
        const currentMultiplier = elapsedToMultiplier(elapsed);
        const currentCashoutValue = myBet
          ? ((myBet.amountCents / 100) * currentMultiplier).toFixed(2)
          : (parseFloat(amount || '0') * currentMultiplier).toFixed(2);

        cashoutTextRef.current.textContent = pending
          ? 'CASHING OUT...'
          : `CASH OUT\nKES ${currentCashoutValue}`;
      }
      controlsRafRef.current = requestAnimationFrame(tick);
    };

    controlsRafRef.current = requestAnimationFrame(tick);

    return () => {
      if (controlsRafRef.current) {
        cancelAnimationFrame(controlsRafRef.current);
        controlsRafRef.current = null;
      }
    };
  }, [phase, canCashOut, flyStartRef, myBet, amount, pending]);

  // Synchronize layout/DOM on React re-render to prevent flickering/snapping
  useLayoutEffect(() => {
    if (phase === 'flying' && canCashOut && flyStartRef && flyStartRef.current && cashoutTextRef.current) {
      const elapsed = Date.now() - flyStartRef.current;
      const currentMultiplier = elapsedToMultiplier(elapsed);
      const currentCashoutValue = myBet
        ? ((myBet.amountCents / 100) * currentMultiplier).toFixed(2)
        : (parseFloat(amount || '0') * currentMultiplier).toFixed(2);

      cashoutTextRef.current.textContent = pending
        ? 'CASHING OUT...'
        : `CASH OUT\nKES ${currentCashoutValue}`;
    }
  }, [phase, canCashOut, flyStartRef, myBet, amount, pending]);

  const cashoutValue = myBet
    ? ((myBet.amountCents / 100) * multiplier).toFixed(2)
    : (parseFloat(amount || '0') * multiplier).toFixed(2);

  return (
    <div className="w-full bg-card rounded-2xl border border-border/50 p-4 md:p-6 shadow-xl flex flex-col md:flex-row gap-4 lg:gap-8 shrink-0">
      <div className="flex-1 flex gap-4">
        <div className="flex-1 space-y-2">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1 flex items-center gap-1">
            <Hash className="w-3 h-3" /> Bet Amount (KES)
          </label>
          <Input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            disabled={hasBet || !canBet}
            className="text-lg h-14 bg-background"
          />
          <div className="flex gap-2">
            {[100, 500, 1000, 5000].map(val => (
              <button
                key={val}
                onClick={() => setAmount(val.toString())}
                disabled={hasBet || !canBet}
                className="flex-1 py-1.5 bg-secondary hover:bg-secondary/80 rounded-md text-xs font-mono font-bold text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                +{val}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1 flex items-center gap-1">
            <Settings2 className="w-3 h-3" /> Auto Cash Out (X)
          </label>
          <Input
            type="number"
            step="0.01"
            value={autoCash}
            onChange={e => setAutoCash(e.target.value)}
            disabled={hasBet || !canBet}
            className="text-lg h-14 bg-background"
          />
          <div className="flex items-center gap-1.5 text-xs">
            {connected
              ? <><Wifi className="w-3 h-3 text-success" /><span className="text-success">Live</span></>
              : <><WifiOff className="w-3 h-3 text-destructive" /><span className="text-destructive">Reconnecting...</span></>
            }
          </div>
        </div>
      </div>

      <div className="w-full md:w-[300px] flex items-end">
        {canCashOut ? (
          <Button size="xl" variant="success" className="w-full h-20 text-xl" onClick={handleCashOut} disabled={pending}>
            <span ref={cashoutTextRef} className="whitespace-pre-line text-center">
              {pending ? 'CASHING OUT...' : `CASH OUT\nKES ${cashoutValue}`}
            </span>
          </Button>
        ) : phase === 'waiting' || phase === 'betting' ? (
          <Button size="xl" className="w-full h-20 text-2xl" onClick={handleBet} disabled={hasBet || pending || !canBet}>
            {pending           ? 'PLACING BET...'
             : hasBet && cashedOut ? 'CASHED OUT ✓'
             : hasBet           ? 'BET PLACED — WAIT'
             : phase === 'betting' ? 'PLACE BET'
             : 'WAITING...'}
          </Button>
        ) : phase === 'flying' && hasBet ? (
          <Button size="xl" variant="success" className="w-full h-20 text-xl" onClick={handleCashOut} disabled={pending || cashedOut}>
            {cashedOut ? 'CASHED OUT ✓' : pending ? 'CASHING OUT...' : `CASH OUT KES ${cashoutValue}`}
          </Button>
        ) : (
          <Button size="xl" variant="secondary" className="w-full h-20 text-xl text-muted-foreground" disabled>
            {phase === 'crashed' ? 'ROUND ENDED' : 'WAIT FOR BETTING'}
          </Button>
        )}
      </div>
    </div>
  );
}
