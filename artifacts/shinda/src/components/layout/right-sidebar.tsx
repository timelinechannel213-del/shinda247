import React, { useMemo } from 'react';
import { Trophy, Shield } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import type { ActiveBet } from '@/hooks/use-game-socket';

interface RightSidebarProps {
  activeBets?: ActiveBet[];
}

// ⚡ Bolt: Derive leaderboard rankings from activeBets WS prop to eliminate ~40 HTTP requests/min from REST polling.
export const RightSidebar = React.memo(function RightSidebar({ activeBets = [] }: RightSidebarProps) {
  const players = useMemo(() => {
    return [...activeBets].sort((a, b) => {
      const aP = a.cashedOutAt != null ? (a.amountCents * a.cashedOutAt) / 100 : 0;
      const bP = b.cashedOutAt != null ? (b.amountCents * b.cashedOutAt) / 100 : 0;
      return bP - aP;
    });
  }, [activeBets]);

  return (
    <aside className="w-80 h-full hidden xl:flex flex-col bg-card border-l border-border/50 z-20">
      <div className="h-20 flex items-center justify-between px-6 border-b border-border/50">
        <h2 className="font-display font-bold text-lg flex items-center gap-2">
          <Trophy className="w-5 h-5 text-warning" />
          LEADERBOARD
        </h2>
        <Shield className="w-5 h-5 text-muted-foreground/50" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <div className="flex text-xs font-bold text-muted-foreground uppercase tracking-wider px-2 pb-2">
          <div className="flex-1">Player</div>
          <div className="w-16 text-right">Mult</div>
          <div className="w-24 text-right">Bet</div>
        </div>

        {players.length === 0 && (
          <div className="py-8 text-center text-muted-foreground text-sm">
            No active bets yet
          </div>
        )}

        {players.map((player) => {
          const isCashedOut = player.cashedOutAt !== null;
          const mult        = isCashedOut ? (player.cashedOutAt! / 100) : null;
          return (
            <div
              key={player.userId}
              className="flex items-center px-3 py-3 rounded-xl bg-secondary/30 border border-border/30 hover:bg-secondary/50 transition-colors"
            >
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                  {player.username.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium text-sm truncate">{player.username}</span>
              </div>

              <div className={cn('w-16 text-right font-mono text-sm font-bold', isCashedOut ? 'text-success' : 'text-muted-foreground')}>
                {mult != null ? `${mult.toFixed(2)}x` : '—'}
              </div>

              <div className="w-24 text-right font-mono text-xs text-muted-foreground">
                {formatCurrency(player.amountCents / 100)}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
});
