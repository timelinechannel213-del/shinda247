import { useState, useEffect, memo } from 'react';
import { Wallet, Plus, Zap, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency, cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { DepositModal } from '@/components/game/deposit-modal';

interface HistoryItem {
  id: number;
  crashPoint: number | null;
  hash: string;
}

// ⚡ Bolt: Wrapped in React.memo to prevent re-rendering on 60fps game state updates in parent
export const Topbar = memo(function Topbar() {
  const { username, balanceCents, token, logout, refreshBalance } = useAuth();
  const [history, setHistory]         = useState<HistoryItem[]>([]);
  const [showDeposit, setShowDeposit] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch('/api/game/history?limit=10');
        if (res.ok) setHistory(await res.json());
      } catch {}
    };
    fetchHistory();
    const iv = setInterval(fetchHistory, 5000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (token) refreshBalance();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <header className="h-16 md:h-20 w-full bg-card border-b border-border/50 flex items-center justify-between px-3 md:px-6 z-20 shrink-0 gap-3">

        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-9 h-9 md:w-11 md:h-11 rounded-full overflow-hidden border-2 border-primary/50 shadow-[0_0_10px_rgba(255,107,0,0.2)] p-0.5 bg-background shrink-0">
              <img
                src={`${import.meta.env.BASE_URL}images/avatar.png`}
                alt="User avatar"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <div className="hidden lg:block">
              <p className="text-sm font-bold text-foreground font-display uppercase leading-none">{username ?? 'Player'}</p>
              <p className="text-xs text-muted-foreground">Shinda 24/7</p>
            </div>
          </div>

          <div className="flex items-center bg-background rounded-xl p-1 pr-3 border border-border/50 gap-2 shrink-0">
            <div className="bg-secondary p-1.5 rounded-lg">
              <Wallet className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] uppercase text-muted-foreground font-bold tracking-wider leading-none">Balance</span>
              <span className="font-mono font-bold text-sm text-foreground leading-snug">
                KES {formatCurrency(balanceCents / 100)}
              </span>
            </div>
          </div>

          <Button
            size="sm"
            className="flex gap-1.5 shrink-0 h-9 px-3 text-xs bg-success hover:bg-success/90 text-white"
            onClick={() => setShowDeposit(true)}
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-bold">DEPOSIT</span>
          </Button>
        </div>

        <div className="hidden lg:flex items-center gap-2 overflow-hidden max-w-[420px] flex-1 justify-center">
          <div className="flex items-center text-xs font-bold text-muted-foreground uppercase tracking-wider mr-2 shrink-0">
            <Zap className="w-4 h-4 mr-1 text-warning" />
            Last
          </div>
          {history.slice(0, 8).map((round, idx) => {
            const m = (round.crashPoint ?? 100) / 100;
            const colorClass =
              m < 2.0 ? 'text-destructive bg-destructive/10 border-destructive/20' :
              m < 5.0 ? 'text-warning bg-warning/10 border-warning/20' :
                        'text-success bg-success/10 border-success/20';
            return (
              <div
                key={round.id ?? idx}
                className={cn(
                  'px-2.5 py-0.5 rounded-full font-mono text-xs font-bold border transition-transform hover:-translate-y-0.5 cursor-pointer shadow-sm shrink-0',
                  colorClass
                )}
              >
                {m.toFixed(2)}x
              </div>
            );
          })}
        </div>

        <button
          onClick={() => logout()}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </header>

      {showDeposit && <DepositModal onClose={() => setShowDeposit(false)} />}
    </>
  );
});
