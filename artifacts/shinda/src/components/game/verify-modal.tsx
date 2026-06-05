import { useState, useEffect } from 'react';
import { Shield, X, Copy, Check, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VerifyModalProps {
  round: {
    id: number;
    hash: string;
    prevHash?: string | null;
    crashPoint: number | null;
  } | null;
  onClose: () => void;
}

function verifyCrashPoint(hash: string, crashX100: number): boolean {
  const MAX = 2 ** 32;
  const h = parseInt(hash.substring(0, 8), 16);
  if (h % 33 === 0) return crashX100 === 100;
  const crashFloat = Math.floor((100 * MAX - h) / (MAX - h)) / 100;
  const computed = Math.floor(Math.max(1.00, crashFloat) * 100);
  return computed === crashX100;
}

async function sha256Hex(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function VerifyModal({ round, onClose }: VerifyModalProps) {
  const [chainValid, setChainValid]   = useState<boolean | null>(null);
  const [copied, setCopied]           = useState<string | null>(null);
  const [customHash, setCustomHash]   = useState('');
  const [customCrash, setCustomCrash] = useState('');
  const [customResult, setCustomResult] = useState<boolean | null>(null);

  const crashMultiplier = round?.crashPoint != null ? round.crashPoint / 100 : null;
  const crashIsValid    = round?.crashPoint != null ? verifyCrashPoint(round.hash, round.crashPoint) : null;

  useEffect(() => {
    if (!round?.hash || !round?.prevHash) { setChainValid(null); return; }
    sha256Hex(round.hash).then(computed => {
      setChainValid(computed === round.prevHash);
    });
  }, [round?.hash, round?.prevHash]);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const handleManualVerify = () => {
    if (!customHash || !customCrash) return;
    const x100 = Math.round(parseFloat(customCrash) * 100);
    setCustomResult(verifyCrashPoint(customHash, x100));
  };

  if (!round) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-lg bg-card border border-border/60 rounded-2xl shadow-2xl p-6 space-y-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="font-display font-bold text-lg">Verify Round #{round.id}</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Game Hash</label>
            <div className="flex items-center gap-2 bg-secondary/40 border border-border/40 rounded-xl px-3 py-2">
              <span className="font-mono text-xs text-foreground/80 flex-1 truncate">{round.hash}</span>
              <button onClick={() => copy(round.hash, 'hash')} className="shrink-0 text-muted-foreground hover:text-primary transition-colors">
                {copied === 'hash' ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {round.prevHash && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Prev Hash <span className="text-muted-foreground/60 normal-case font-normal">(SHA256 of this hash)</span>
              </label>
              <div className="flex items-center gap-2 bg-secondary/40 border border-border/40 rounded-xl px-3 py-2">
                <span className="font-mono text-xs text-foreground/80 flex-1 truncate">{round.prevHash}</span>
                <button onClick={() => copy(round.prevHash!, 'prev')} className="shrink-0 text-muted-foreground hover:text-primary transition-colors">
                  {copied === 'prev' ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-secondary/30 border border-border/30 rounded-xl p-3 space-y-1">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Crash Point</div>
            <div className="font-mono font-black text-2xl">
              {crashMultiplier != null ? `${crashMultiplier.toFixed(2)}x` : '—'}
            </div>
          </div>
          <div className={cn(
            'border rounded-xl p-3 space-y-1',
            crashIsValid === null ? 'bg-secondary/30 border-border/30' :
            crashIsValid ? 'bg-success/10 border-success/30' : 'bg-destructive/10 border-destructive/30'
          )}>
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Crash Verified</div>
            <div className={cn(
              'font-black text-2xl',
              crashIsValid === null ? 'text-muted-foreground' :
              crashIsValid ? 'text-success' : 'text-destructive'
            )}>
              {crashIsValid === null ? '—' : crashIsValid ? '✅ FAIR' : '❌ INVALID'}
            </div>
          </div>
          {round.prevHash && (
            <div className={cn(
              'col-span-2 border rounded-xl p-3 space-y-1',
              chainValid === null ? 'bg-secondary/30 border-border/30' :
              chainValid ? 'bg-success/10 border-success/30' : 'bg-destructive/10 border-destructive/30'
            )}>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Chain Link (SHA256)</div>
              <div className={cn(
                'font-bold text-sm',
                chainValid === null ? 'text-muted-foreground' :
                chainValid ? 'text-success' : 'text-destructive'
              )}>
                {chainValid === null ? 'Verifying...' : chainValid ? '✅ Chain intact — hash not tampered' : '❌ Chain broken'}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border/30 pt-4 space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Verify Manually</p>
          <div className="flex gap-2">
            <input
              className="flex-1 bg-background border border-border/50 rounded-lg px-3 py-2 text-xs font-mono placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50"
              placeholder="Paste any game hash..."
              value={customHash}
              onChange={e => { setCustomHash(e.target.value); setCustomResult(null); }}
            />
            <input
              className="w-20 bg-background border border-border/50 rounded-lg px-3 py-2 text-xs font-mono placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50"
              placeholder="2.35x"
              value={customCrash}
              onChange={e => { setCustomCrash(e.target.value); setCustomResult(null); }}
            />
            <button
              onClick={handleManualVerify}
              className="px-3 py-2 bg-primary/20 hover:bg-primary/30 border border-primary/30 rounded-lg text-xs font-bold text-primary transition-colors"
            >
              Verify
            </button>
          </div>
          {customResult !== null && (
            <div className={cn(
              'text-sm font-bold px-3 py-2 rounded-lg',
              customResult ? 'bg-success/10 text-success border border-success/30' : 'bg-destructive/10 text-destructive border border-destructive/30'
            )}>
              {customResult ? '✅ Hash verifies correctly — this round is provably fair' : '❌ Hash mismatch — crash point does not match'}
            </div>
          )}
        </div>

        <a
          href="https://github.com/timelinechannel213-del/shinda247"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          View source code to verify the algorithm yourself
        </a>
      </div>
    </div>
  );
}
