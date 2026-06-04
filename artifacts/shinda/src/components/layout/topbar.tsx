import { useState, useEffect } from 'react';
import { Wallet, Plus, Zap, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency, cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import type { GameState } from '@/hooks/use-game-socket';

interface TopbarProps {
  gameState?: GameState;
}

interface HistoryItem {
  id: number;
  crashPoint: number | null;
  hash: string;
}

export function Topbar({ gameState: _gameState }: TopbarProps) {
  const { username, balanceCents, token, logout, refreshBalance } = useAuth();
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch('/api/game/history?limit=10');
        if (res.ok) {
          const data = await res.json();
          setHistory(data);
        }
      } catch {}
    };
    fetchHistory();
    const iv = setInterval(fetchHistory, 5000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (token) refreshBalance();
  }, [token]);

  return (
    <header className="h-20 w-full bg-card border-b border-border/50 flex items-center justify-between px-4 md:px-6 z-20 shrink-0">

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary/50 shadow-[0_0_10px_rgba(255,107,0,0.2)] p-0.5 bg-background">
            <img
              src={`${import.meta.env.BASE_URL}images/avatar.png`}
              alt="User avatar"
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-bold text-foreground font-display uppercase">
              {username ?? 'Player'}
            </p>
            <p className="text-xs text-muted-foreground">Shinda 24/7</p>
          </div>
        </div>

        <div className="h-10 w-px bg-border/50 hidden sm:block mx-2" />

        <div className="flex items-center bg-background rounded-xl p-1 pr-4 border border-border/50">
          <div className="bg-secondary p-2 rounded-lg mr-3">
            <Wallet className="w-4 h-4 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider leading-none">
              Balance
            </span>
            <span className="font-mono font-bold text-sm text-foreground">
              KES {formatCurrency(balanceCents / 100)}
            </span>
          </div>
        </div>

        <Button size="sm" className="hidden md:flex gap-2">
          <Plus className="w-4 h-4" />
          DEPOSIT
        </Button>
      </div>

      <div className="hidden lg:flex items-center gap-2 overflow-hidden max-w-[420px]">
        <div className="flex items-center text-xs font-bold text-muted-foreground uppercase tracking-wider mr-2 shrink-0">
          <Zap className="w-4 h-4 mr-1 text-warning" />
          Previous
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
                'px-3 py-1 rounded-full font-mono text-sm font-bold border transition-transform hover:-translate-y-0.5 cursor-pointer shadow-sm shrink-0',
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
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        title="Logout"
      >
        <LogOut className="w-4 h-4" />
        <span className="hidden sm:inline">Logout</span>
      </button>
    </header>
  );
}
