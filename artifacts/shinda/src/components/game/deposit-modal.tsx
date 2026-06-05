import { useState } from 'react';
import { X, Smartphone, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface DepositModalProps {
  onClose: () => void;
}

const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

type Step = 'form' | 'pending' | 'success';

export function DepositModal({ onClose }: DepositModalProps) {
  const { token, refreshBalance } = useAuth();
  const { toast } = useToast();

  const [amount, setAmount]   = useState('500');
  const [phone, setPhone]     = useState('');
  const [step, setStep]       = useState<Step>('form');
  const [loading, setLoading] = useState(false);

  const handleDeposit = async () => {
    const amountKes = parseFloat(amount);
    if (!amountKes || amountKes < 10) {
      toast({ title: 'Minimum deposit is KES 10', variant: 'destructive' }); return;
    }
    if (!phone.trim()) {
      toast({ title: 'Enter your M-Pesa phone number', variant: 'destructive' }); return;
    }

    setLoading(true);
    try {
      const res  = await fetch('/api/mpesa/stk-push', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ amountKes, phone }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 503) {
          toast({
            title:       'M-Pesa not configured',
            description: 'Contact support to enable deposits.',
            variant:     'destructive',
          });
        } else {
          toast({ title: data.error ?? 'Payment failed', variant: 'destructive' });
        }
        return;
      }

      setStep('pending');
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        await refreshBalance();
        if (attempts >= 30) {
          clearInterval(poll);
          setStep('success');
        }
      }, 3000);
    } catch {
      toast({ title: 'Network error', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-md bg-card border border-border/60 rounded-2xl shadow-2xl p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-success" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg">Deposit via M-Pesa</h2>
              <p className="text-xs text-muted-foreground">Instant STK push to your phone</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 'form' && (
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Amount (KES)</label>
              <Input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="h-14 text-2xl font-mono text-center"
                placeholder="500"
              />
              <div className="grid grid-cols-3 gap-2">
                {QUICK_AMOUNTS.map(v => (
                  <button
                    key={v}
                    onClick={() => setAmount(String(v))}
                    className={cn(
                      'py-2 rounded-lg text-sm font-bold border transition-colors',
                      amount === String(v)
                        ? 'bg-primary/20 border-primary/50 text-primary'
                        : 'bg-secondary/30 border-border/30 text-muted-foreground hover:bg-secondary hover:text-foreground'
                    )}
                  >
                    {v.toLocaleString()}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground text-center">Min: KES 10 · Max: KES 150,000</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">M-Pesa Phone</label>
              <Input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="h-12 text-base"
                placeholder="254712345678"
              />
              <p className="text-xs text-muted-foreground">Format: 254XXXXXXXXX (leave as your registered phone)</p>
            </div>

            <Button
              className="w-full h-14 text-lg bg-success hover:bg-success/90 text-white font-bold"
              onClick={handleDeposit}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              {loading ? 'Sending STK Push...' : `PAY KES ${parseFloat(amount || '0').toLocaleString()} WITH M-PESA`}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              You'll receive a prompt on your phone. Enter your M-Pesa PIN to complete.
            </p>
          </div>
        )}

        {step === 'pending' && (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-success/20 border-2 border-success/30 flex items-center justify-center mx-auto">
              <Smartphone className="w-8 h-8 text-success animate-pulse" />
            </div>
            <h3 className="font-bold text-lg">Check Your Phone!</h3>
            <p className="text-muted-foreground text-sm">
              An M-Pesa STK push has been sent to your phone.<br />
              Enter your PIN to complete the deposit.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Waiting for confirmation...
            </div>
            <button onClick={() => setStep('success')} className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors mt-4">
              Already paid? Click here
            </button>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-success/20 border-2 border-success/50 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <h3 className="font-bold text-lg text-success">Payment Sent!</h3>
            <p className="text-muted-foreground text-sm">
              Your deposit will reflect in your balance once M-Pesa confirms the transaction.
            </p>
            <Button className="w-full" onClick={onClose}>Close</Button>
          </div>
        )}
      </div>
    </div>
  );
}
