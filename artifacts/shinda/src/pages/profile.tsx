import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { User, Wallet, ArrowDownLeft, ArrowUpRight, Trophy, TrendingDown, Edit2, Check, X, Clock } from 'lucide-react';

interface ProfileData {
  userId: number;
  username: string;
  phone: string;
  createdAt: string;
  balanceCents: number;
  totalDepositedCents: number;
  totalWithdrawnCents: number;
  totalWonCents: number;
  totalBetCents: number;
}

interface Txn {
  id: number;
  type: string;
  amountCents: number;
  description: string | null;
  createdAt: string;
  balanceAfter: number;
}

const TYPE_LABELS: Record<string, string> = {
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  bet: 'Bet',
  win: 'Win',
  refund: 'Refund',
  bonus: 'Bonus',
};

const TYPE_COLORS: Record<string, string> = {
  deposit: 'text-success',
  win:     'text-success',
  refund:  'text-success',
  bonus:   'text-success',
  bet:     'text-destructive',
  withdrawal: 'text-destructive',
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  deposit:    ArrowDownLeft,
  win:        Trophy,
  refund:     ArrowDownLeft,
  bonus:      Trophy,
  bet:        TrendingDown,
  withdrawal: ArrowUpRight,
};

function fmt(cents: number) {
  return `KES ${(cents / 100).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ProfilePage() {
  const { token, username: authUsername, refreshBalance } = useAuth();
  const { toast } = useToast();

  const [profile, setProfile]       = useState<ProfileData | null>(null);
  const [txns, setTxns]             = useState<Txn[]>([]);
  const [loading, setLoading]       = useState(true);
  const [editing, setEditing]       = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [saving, setSaving]         = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!token) return;
    try {
      const [pRes, tRes] = await Promise.all([
        fetch('/api/auth/profile', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/transactions?limit=50', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (pRes.ok) setProfile(await pRes.json());
      if (tRes.ok) setTxns(await tRes.json());
    } catch {
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleSaveUsername = async () => {
    if (!token || !newUsername.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username: newUsername.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { toast({ title: data.error ?? 'Failed to update', variant: 'destructive' }); return; }
      setProfile(p => p ? { ...p, username: data.username } : p);
      toast({ title: 'Username updated!' });
      setEditing(false);
      refreshBalance();
    } catch {
      toast({ title: 'Network error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground animate-pulse">Loading profile...</div>
        </div>
      </div>
    );
  }

  const initials = (profile?.username ?? authUsername ?? '?').slice(0, 2).toUpperCase();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <div className="h-20 flex items-center px-6 border-b border-border/50 bg-card shrink-0">
          <div className="flex items-center gap-3">
            <User className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-display font-bold">My Profile</h1>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 max-w-3xl mx-auto w-full">

          <div className="bg-card border border-border/50 rounded-2xl p-6 flex items-start gap-5">
            <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary/30 flex items-center justify-center text-xl font-black text-primary shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="flex items-center gap-2 mb-1">
                  <input
                    className="bg-background border border-border rounded-lg px-3 py-1.5 text-lg font-bold focus:outline-none focus:border-primary/50 w-48"
                    value={newUsername}
                    onChange={e => setNewUsername(e.target.value)}
                    autoFocus
                    maxLength={32}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveUsername(); if (e.key === 'Escape') setEditing(false); }}
                  />
                  <button onClick={handleSaveUsername} disabled={saving} className="p-1.5 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEditing(false)} className="p-1.5 rounded-lg bg-secondary text-muted-foreground hover:bg-secondary/80 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl font-display font-black">{profile?.username ?? authUsername}</span>
                  <button
                    onClick={() => { setEditing(true); setNewUsername(profile?.username ?? ''); }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              )}
              <p className="text-sm text-muted-foreground">{profile?.phone}</p>
              {profile?.createdAt && (
                <p className="text-xs text-muted-foreground/60 mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Member since {new Date(profile.createdAt).toLocaleDateString('en-KE', { month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: 'Balance',    icon: Wallet,      value: profile?.balanceCents ?? 0,       color: 'text-foreground', bg: 'bg-card' },
              { label: 'Deposited',  icon: ArrowDownLeft, value: profile?.totalDepositedCents ?? 0, color: 'text-success',    bg: 'bg-success/5 border-success/20' },
              { label: 'Withdrawn',  icon: ArrowUpRight,  value: profile?.totalWithdrawnCents ?? 0, color: 'text-warning',   bg: 'bg-warning/5 border-warning/20' },
              { label: 'Total Won',  icon: Trophy,        value: profile?.totalWonCents ?? 0,      color: 'text-success',    bg: 'bg-success/5 border-success/20' },
              { label: 'Total Bet',  icon: TrendingDown,  value: profile?.totalBetCents ?? 0,      color: 'text-destructive', bg: 'bg-destructive/5 border-destructive/20' },
              { label: 'Net P&L',    icon: Trophy,        value: (profile?.totalWonCents ?? 0) - (profile?.totalBetCents ?? 0), color: ((profile?.totalWonCents ?? 0) - (profile?.totalBetCents ?? 0)) >= 0 ? 'text-success' : 'text-destructive', bg: 'bg-card' },
            ].map(({ label, icon: Icon, value, color, bg }) => (
              <div key={label} className={cn('border border-border/50 rounded-xl p-4 space-y-1', bg)}>
                <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </div>
                <div className={cn('font-mono font-bold text-sm', color)}>
                  {fmt(value)}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border/50 flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-display font-bold">Transaction History</h2>
              <span className="ml-auto text-xs text-muted-foreground">{txns.length} transactions</span>
            </div>
            {txns.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">No transactions yet</div>
            ) : (
              <div className="divide-y divide-border/30">
                <div className="flex text-xs font-bold text-muted-foreground uppercase tracking-wider px-5 py-3 bg-secondary/20">
                  <div className="w-24">Type</div>
                  <div className="flex-1">Description</div>
                  <div className="w-32 text-right">Amount</div>
                  <div className="w-28 text-right hidden md:block">Time</div>
                </div>
                {txns.map(t => {
                  const Icon = TYPE_ICONS[t.type] ?? ArrowDownLeft;
                  const isCredit = ['deposit', 'win', 'refund', 'bonus'].includes(t.type);
                  return (
                    <div key={t.id} className="flex items-center px-5 py-3 hover:bg-secondary/20 transition-colors">
                      <div className="w-24 flex items-center gap-1.5">
                        <Icon className={cn('w-3.5 h-3.5 shrink-0', TYPE_COLORS[t.type] ?? 'text-muted-foreground')} />
                        <span className={cn('text-xs font-bold', TYPE_COLORS[t.type] ?? 'text-muted-foreground')}>{TYPE_LABELS[t.type] ?? t.type}</span>
                      </div>
                      <div className="flex-1 text-xs text-muted-foreground truncate pr-3">{t.description ?? '—'}</div>
                      <div className={cn('w-32 text-right font-mono text-sm font-bold', TYPE_COLORS[t.type] ?? 'text-muted-foreground')}>
                        {isCredit ? '+' : '-'}{fmt(t.amountCents)}
                      </div>
                      <div className="w-28 text-right text-xs text-muted-foreground hidden md:block">
                        {new Date(t.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
