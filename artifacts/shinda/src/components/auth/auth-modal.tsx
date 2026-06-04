import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

type Step = 'phone' | 'otp-register' | 'otp-login' | 'username';

export function AuthModal() {
  const { login }   = useAuth();
  const { toast }   = useToast();
  const [step, setStep]         = useState<Step>('phone');
  const [mode, setMode]         = useState<'login' | 'register'>('login');
  const [phone, setPhone]       = useState('');
  const [otp, setOtp]           = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading]   = useState(false);

  const handleRequestOtp = async () => {
    if (!phone.trim()) { toast({ title: 'Enter your phone number', variant: 'destructive' }); return; }
    setLoading(true);
    try {
      const res  = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) { toast({ title: data.error, variant: 'destructive' }); return; }
      toast({ title: 'OTP sent!', description: 'Check your phone (dev: check server logs)' });
      setStep(mode === 'register' ? 'otp-register' : 'otp-login');
    } catch {
      toast({ title: 'Network error', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!otp.trim()) { toast({ title: 'Enter the OTP', variant: 'destructive' }); return; }
    setLoading(true);
    try {
      const res  = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      });
      const data = await res.json();
      if (!res.ok) { toast({ title: data.error, variant: 'destructive' }); return; }
      login(data.token, data.userId, data.username);
    } catch {
      toast({ title: 'Network error', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!otp.trim() || !username.trim()) {
      toast({ title: 'Fill in all fields', variant: 'destructive' }); return;
    }
    setLoading(true);
    try {
      const res  = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp, username }),
      });
      const data = await res.json();
      if (!res.ok) { toast({ title: data.error, variant: 'destructive' }); return; }
      login(data.token, data.userId, data.username);
    } catch {
      toast({ title: 'Network error', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-card border border-border/60 rounded-2xl p-8 w-full max-w-sm shadow-2xl mx-4">

        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🚀</div>
          <h1 className="text-2xl font-bold font-display text-foreground">Shinda 24/7</h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time crash game</p>
        </div>

        {step === 'phone' && (
          <div className="space-y-4">
            <div className="flex gap-2 rounded-lg border border-border/50 p-1">
              <button
                onClick={() => setMode('login')}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'login' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Login
              </button>
              <button
                onClick={() => setMode('register')}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'register' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Register
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Phone Number
              </label>
              <Input
                placeholder="254712345678"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleRequestOtp()}
                className="h-12 text-base"
              />
              <p className="text-xs text-muted-foreground">Format: 254XXXXXXXXX</p>
            </div>

            <Button
              className="w-full h-12 text-base"
              onClick={handleRequestOtp}
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Get OTP Code'}
            </Button>
          </div>
        )}

        {step === 'otp-login' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                OTP Code
              </label>
              <Input
                placeholder="123456"
                maxLength={6}
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                className="h-12 text-2xl text-center tracking-widest"
              />
              <p className="text-xs text-muted-foreground">Sent to {phone}</p>
            </div>

            <Button className="w-full h-12 text-base" onClick={handleLogin} disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>

            <button
              onClick={() => setStep('phone')}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back
            </button>
          </div>
        )}

        {step === 'otp-register' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                OTP Code
              </label>
              <Input
                placeholder="123456"
                maxLength={6}
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                className="h-12 text-2xl text-center tracking-widest"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Username
              </label>
              <Input
                placeholder="JohnDoe"
                value={username}
                onChange={e => setUsername(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleRegister()}
                className="h-12 text-base"
              />
            </div>

            <Button className="w-full h-12 text-base" onClick={handleRegister} disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>

            <button
              onClick={() => setStep('phone')}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
