import { useState, useEffect, useRef } from 'react';
import { Button }   from '@/components/ui/button';
import { Input }    from '@/components/ui/input';
import { Hash, Settings2, Wifi, WifiOff } from 'lucide-react';
import { useAuth }  from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
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
  flyStartRef: React.RefObject<number | null>;
}

export function GameControls({ gameState, activeBets, connected, send, onWin, flyStartRef }: GameControlsProps) {
  const { token, userId, refreshBalance } = useAuth();
  const { toast } = useToast();

  const [amount, setAmount]     = useState<string>('500');
  const [autoCash, setAutoCash] = useState<string>('4.3');
  const [pending, setPending]   = useState(false);

  const prevRoundId = useRef<number>(0);
  const cashoutBtnRef = useRef<HTMLButtonElement>(null);
  const rafRef = useRef<number | null>(null);

  const { phase, multiplier, roundId, id } = gameState;

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

  const K = 35_000;
  const elapsedToMultiplier = (ms: number) => Math.round(Math.exp(ms / K) * 100) / 100;

  const handleCashOut = async () => {
    if (!token) return;
    // ⚡ Bolt: Use real-time multiplier for cashout to ensure accuracy,
    // as gameState.multiplier is no longer updated at 60fps.
    const elapsed = Date.now() - (flyStartRef.current ?? Date.now());
    const cashoutMultiplier = phase === 'flying' ? elapsedToMultiplier(elapsed) : multiplier;

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

  const cashoutValue = myBet
    ? ((myBet.amountCents / 100) * multiplier).toFixed(2)
    : (parseFloat(amount || '0') * multiplier).toFixed(2);

  // ⚡ Bolt: Direct DOM update for cashout button value to avoid 60fps re-renders.
  useEffect(() => {
    if (phase !== 'flying' || !flyStartRef.current) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    const update = () => {
      if (cashoutBtnRef.current) {
        const elapsed = Date.now() - (flyStartRef.current ?? Date.now());
        const m = elapsedToMultiplier(elapsed);
        const val = myBet
          ? ((myBet.amountCents / 100) * m).toFixed(2)
          : (parseFloat(amount || '0') * m).toFixed(2);

        if (canCashOut) {
          cashoutBtnRef.current.textContent = pending ? 'CASHING OUT...' : `CASH OUT\nKES ${val}`;
        } else if (hasBet && !cashedOut) {
          cashoutBtnRef.current.textContent = `CASH OUT KES ${val}`;
        }
      }
      rafRef.current = requestAnimationFrame(update);
    };
    rafRef.current = requestAnimationFrame(update);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [phase, myBet, amount, canCashOut, hasBet, cashedOut, pending, flyStartRef]);

  // ⚡ Bolt: useLayoutEffect ensures the button text is correct after a React re-render.
  useLayoutEffect(() => {
    if (cashoutBtnRef.current) {
      if (canCashOut) {
        cashoutBtnRef.current.textContent = pending ? 'CASHING OUT...' : `CASH OUT\nKES ${cashoutValue}`;
      } else if (phase === 'waiting' || phase === 'betting') {
        const label = pending ? 'PLACING BET...'
          : hasBet && cashedOut ? 'CASHED OUT ✓'
          : hasBet ? 'BET PLACED — WAIT'
          : phase === 'betting' ? 'PLACE BET'
          : 'WAITING...';
        cashoutBtnRef.current.textContent = label;
      } else if (phase === 'flying' && hasBet) {
        cashoutBtnRef.current.textContent = cashedOut ? 'CASHED OUT ✓' : pending ? 'CASHING OUT...' : `CASH OUT KES ${cashoutValue}`;
      } else {
        cashoutBtnRef.current.textContent = phase === 'crashed' ? 'ROUND ENDED' : 'WAIT FOR BETTING';
      }
    }
  }, [canCashOut, pending, cashoutValue, phase, hasBet, cashedOut]);

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
          <Button ref={cashoutBtnRef} size="xl" variant="success" className="w-full h-20 text-xl" onClick={handleCashOut} disabled={pending}>
            {pending ? 'CASHING OUT...' : `CASH OUT\nKES ${cashoutValue}`}
          </Button>
        ) : phase === 'waiting' || phase === 'betting' ? (
          <Button ref={cashoutBtnRef} size="xl" className="w-full h-20 text-2xl" onClick={handleBet} disabled={hasBet || pending || !canBet}>
            {pending           ? 'PLACING BET...'
             : hasBet && cashedOut ? 'CASHED OUT ✓'
             : hasBet           ? 'BET PLACED — WAIT'
             : phase === 'betting' ? 'PLACE BET'
             : 'WAITING...'}
          </Button>
        ) : phase === 'flying' && hasBet ? (
          <Button ref={cashoutBtnRef} size="xl" variant="success" className="w-full h-20 text-xl" onClick={handleCashOut} disabled={pending || cashedOut}>
            {cashedOut ? 'CASHED OUT ✓' : pending ? 'CASHING OUT...' : `CASH OUT KES ${cashoutValue}`}
          </Button>
        ) : (
          <Button ref={cashoutBtnRef} size="xl" variant="secondary" className="w-full h-20 text-xl text-muted-foreground" disabled>
            {phase === 'crashed' ? 'ROUND ENDED' : 'WAIT FOR BETTING'}
          </Button>
        )}
      </div>
    </div>
  );
}
