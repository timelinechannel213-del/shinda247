import { useState, useEffect, memo } from 'react';
import { cn } from '@/lib/utils';
import { History, MessageSquare, UserPlus, TrendingUp, TrendingDown } from 'lucide-react';
import { VerifyModal } from './verify-modal';
import { useAuth } from '@/contexts/AuthContext';

interface HistoryItem {
  id: number;
  crashPoint: number | null;
  hash: string;
  prevHash?: string | null;
  createdAt: string;
}

interface MyBet {
  id: number;
  gameId: number;
  amountCents: number;
  cashedOutAt: number | null;
  payoutCents: number | null;
  state: string;
  createdAt: string;
}

const tabs = [
  { id: 'history', label: 'History',   icon: History },
  { id: 'mybets',  label: 'My Bets',   icon: TrendingUp },
  { id: 'support', label: 'Support',   icon: MessageSquare },
  { id: 'refer',   label: 'Refer',     icon: UserPlus },
];

// ⚡ Bolt: Wrap HistoryPanel with memo to prevent re-rendering on 60fps game multiplier ticker state updates
export const HistoryPanel = memo(function HistoryPanel() {
  const { token } = useAuth();
  const [activeTab, setActiveTab]     = useState('history');
  const [history, setHistory]         = useState<HistoryItem[]>([]);
  const [myBets, setMyBets]           = useState<MyBet[]>([]);
  const [verifyRound, setVerifyRound] = useState<HistoryItem | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch('/api/game/history?limit=20');
        if (res.ok) setHistory(await res.json());
      } catch {}
    };
    fetchHistory();
    const iv = setInterval(fetchHistory, 8000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (activeTab !== 'mybets' || !token) return;
    const fetchBets = async () => {
      try {
        const res = await fetch('/api/game/my-bets?limit=30', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setMyBets(await res.json());
      } catch {}
    };
    fetchBets();
    const iv = setInterval(fetchBets, 8000);
    return () => clearInterval(iv);
  }, [activeTab, token]);

  const betsStats = myBets.reduce(
    (acc, b) => ({
      totalBet:  acc.totalBet + b.amountCents,
      totalWon:  acc.totalWon + (b.payoutCents ?? 0),
    }),
    { totalBet: 0, totalWon: 0 }
  );
  const netPnl = betsStats.totalWon - betsStats.totalBet;

  return (
    <>
      <div className="w-full bg-card rounded-2xl border border-border/50 shadow-xl overflow-hidden flex flex-col h-[420px]">
        <div className="flex border-b border-border/50 bg-secondary/30 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-4 text-xs font-bold tracking-wider uppercase transition-colors relative whitespace-nowrap px-3',
                activeTab === tab.id ? 'text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_10px_rgba(255,107,0,0.8)]" />
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto bg-background">
          {/* ---- HISTORY ---- */}
          {activeTab === 'history' && (
            <div className="divide-y divide-border/30">
              <div className="flex text-xs font-bold text-muted-foreground uppercase tracking-wider px-4 py-2.5 bg-secondary/20 sticky top-0">
                <div className="w-14">#</div>
                <div className="flex-1">Hash <span className="text-muted-foreground/40 normal-case font-normal">(click to verify)</span></div>
                <div className="w-24 text-right">Crash</div>
                <div className="w-20 text-right hidden sm:block">Time</div>
              </div>
              {history.length === 0 && (
                <div className="py-12 text-center text-muted-foreground text-sm">No rounds yet</div>
              )}
              {history.map(round => {
                const m = (round.crashPoint ?? 100) / 100;
                const colorClass = m < 2 ? 'text-destructive' : m < 5 ? 'text-yellow-400' : 'text-success';
                return (
                  <div key={round.id} className="flex items-center px-4 py-2.5 hover:bg-secondary/20 transition-colors">
                    <div className="w-14 font-mono text-xs text-muted-foreground">#{round.id}</div>
                    <div className="flex-1 pr-4">
                      <button
                        onClick={() => setVerifyRound(round)}
                        className="font-mono text-xs text-muted-foreground/60 hover:text-primary transition-colors truncate max-w-full block text-left"
                        title="Click to verify"
                      >
                        {round.hash.slice(0, 14)}...
                      </button>
                    </div>
                    <div className={cn('w-24 text-right font-mono font-bold text-sm', colorClass)}>
                      {m.toFixed(2)}x
                    </div>
                    <div className="w-20 text-right text-xs text-muted-foreground hidden sm:block">
                      {new Date(round.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ---- MY BETS ---- */}
          {activeTab === 'mybets' && (
            <div className="flex flex-col h-full">
              <div className="divide-y divide-border/30 flex-1">
                <div className="flex text-xs font-bold text-muted-foreground uppercase tracking-wider px-4 py-2.5 bg-secondary/20 sticky top-0">
                  <div className="w-16">Round</div>
                  <div className="w-28">Bet</div>
                  <div className="w-24">Cashout</div>
                  <div className="flex-1 text-right">Profit</div>
                </div>
                {myBets.length === 0 && (
                  <div className="py-12 text-center text-muted-foreground text-sm">No bets yet</div>
                )}
                {myBets.map(b => {
                  const isWin    = b.state === 'cashed_out';
                  const mult     = b.cashedOutAt != null ? (b.cashedOutAt / 100).toFixed(2) + 'x' : 'LOST';
                  const profit   = isWin
                    ? (b.payoutCents ?? 0) - b.amountCents
                    : -b.amountCents;
                  return (
                    <div key={b.id} className="flex items-center px-4 py-2.5 hover:bg-secondary/20 transition-colors">
                      <div className="w-16 font-mono text-xs text-muted-foreground">#{b.gameId}</div>
                      <div className="w-28 font-mono text-xs">
                        KES {(b.amountCents / 100).toFixed(2)}
                      </div>
                      <div className={cn('w-24 font-mono font-bold text-sm', isWin ? 'text-success' : 'text-destructive')}>
                        {mult}
                      </div>
                      <div className={cn('flex-1 text-right font-mono font-bold text-sm flex items-center justify-end gap-1', isWin ? 'text-success' : 'text-destructive')}>
                        {isWin ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {isWin ? '+' : ''}{(profit / 100).toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>

              {myBets.length > 0 && (
                <div className="border-t border-border/50 px-4 py-3 bg-secondary/20 grid grid-cols-3 gap-3 text-xs shrink-0">
                  <div>
                    <div className="text-muted-foreground font-bold uppercase tracking-wider mb-0.5">Total Bet</div>
                    <div className="font-mono font-bold">KES {(betsStats.totalBet / 100).toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground font-bold uppercase tracking-wider mb-0.5">Total Won</div>
                    <div className="font-mono font-bold text-success">KES {(betsStats.totalWon / 100).toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground font-bold uppercase tracking-wider mb-0.5">Net P&L</div>
                    <div className={cn('font-mono font-bold', netPnl >= 0 ? 'text-success' : 'text-destructive')}>
                      {netPnl >= 0 ? '+' : ''}KES {(netPnl / 100).toFixed(2)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'support' && (
            <div className="p-6 space-y-4">
              <h3 className="font-bold text-lg">Customer Support</h3>
              <p className="text-muted-foreground text-sm">Our team is available 24/7 via WhatsApp.</p>
              <a
                href="https://wa.me/254700000000"
                className="flex items-center gap-3 p-4 bg-success/10 border border-success/30 rounded-xl hover:bg-success/20 transition-colors"
              >
                <div className="w-10 h-10 bg-success/20 rounded-full flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-success" />
                </div>
                <div>
                  <div className="font-bold text-sm">WhatsApp Support</div>
                  <div className="text-xs text-muted-foreground">+254 700 000 000</div>
                </div>
              </a>
            </div>
          )}

          {activeTab === 'refer' && (
            <div className="p-6 space-y-4">
              <h3 className="font-bold text-lg">Refer & Earn</h3>
              <p className="text-muted-foreground text-sm">Invite friends and earn 5% of their first deposit!</p>
              <div className="bg-secondary/30 rounded-xl p-4 border border-border/50">
                <p className="text-xs text-muted-foreground mb-2 font-bold uppercase tracking-wider">Referral Link</p>
                <p className="font-mono text-sm text-primary break-all">https://shinda247.co.ke/r/YOUR_CODE</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <VerifyModal round={verifyRound} onClose={() => setVerifyRound(null)} />
    </>
  );
});
