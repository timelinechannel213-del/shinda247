import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { History, MessageSquare, UserPlus } from 'lucide-react';
import { VerifyModal } from './verify-modal';

interface HistoryItem {
  id: number;
  crashPoint: number | null;
  hash: string;
  prevHash?: string | null;
  createdAt: string;
}

const tabs = [
  { id: 'history', label: 'History',       icon: History },
  { id: 'support', label: 'Customer Care', icon: MessageSquare },
  { id: 'refer',   label: 'Refer & Earn',  icon: UserPlus },
];

export function HistoryPanel() {
  const [activeTab, setActiveTab]   = useState('history');
  const [history, setHistory]       = useState<HistoryItem[]>([]);
  const [verifyRound, setVerifyRound] = useState<HistoryItem | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch('/api/game/history?limit=15');
        if (res.ok) setHistory(await res.json());
      } catch {}
    };
    fetchHistory();
    const iv = setInterval(fetchHistory, 8000);
    return () => clearInterval(iv);
  }, []);

  return (
    <>
      <div className="w-full bg-card rounded-2xl border border-border/50 shadow-xl overflow-hidden flex flex-col h-[400px]">
        <div className="flex border-b border-border/50 bg-secondary/30">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-4 text-sm font-bold tracking-wider uppercase transition-colors relative',
                activeTab === tab.id
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_10px_rgba(255,107,0,0.8)]" />
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto bg-background p-0">
          {activeTab === 'history' && (
            <div className="divide-y divide-border/30">
              <div className="flex text-xs font-bold text-muted-foreground uppercase tracking-wider px-4 py-3 bg-secondary/20">
                <div className="w-16">#</div>
                <div className="flex-1">Hash <span className="text-muted-foreground/50 normal-case font-normal">(click to verify)</span></div>
                <div className="w-28 text-right">Crashed At</div>
                <div className="w-32 text-right">Time</div>
              </div>
              {history.length === 0 && (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  No rounds yet
                </div>
              )}
              {history.map((round) => {
                const m = (round.crashPoint ?? 100) / 100;
                const colorClass =
                  m < 2.0 ? 'text-destructive' :
                  m < 5.0 ? 'text-warning' :
                             'text-success';
                return (
                  <div
                    key={round.id}
                    className="flex items-center px-4 py-3 hover:bg-secondary/20 transition-colors"
                  >
                    <div className="w-16 font-mono text-xs text-muted-foreground">#{round.id}</div>
                    <div className="flex-1 pr-4">
                      <button
                        onClick={() => setVerifyRound(round)}
                        className="font-mono text-xs text-muted-foreground/70 hover:text-primary transition-colors truncate max-w-full block text-left"
                        title="Click to verify this round"
                      >
                        {round.hash.slice(0, 16)}...
                      </button>
                    </div>
                    <div className={cn('w-28 text-right font-mono font-bold text-sm', colorClass)}>
                      {m.toFixed(2)}x
                    </div>
                    <div className="w-32 text-right text-xs text-muted-foreground">
                      {new Date(round.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'support' && (
            <div className="p-6 space-y-4">
              <h3 className="font-bold text-lg">Customer Support</h3>
              <p className="text-muted-foreground text-sm">
                For support, contact us via WhatsApp or email. Our team is available 24/7.
              </p>
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
              <p className="text-muted-foreground text-sm">
                Invite friends and earn 5% of their first deposit!
              </p>
              <div className="bg-secondary/30 rounded-xl p-4 border border-border/50">
                <p className="text-xs text-muted-foreground mb-2 font-bold uppercase tracking-wider">
                  Your Referral Link
                </p>
                <p className="font-mono text-sm text-primary break-all">
                  https://shinda247.co.ke/r/YOUR_CODE
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <VerifyModal
        round={verifyRound}
        onClose={() => setVerifyRound(null)}
      />
    </>
  );
}
