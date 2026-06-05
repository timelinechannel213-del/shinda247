import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff } from 'lucide-react';

type Mode = 'login' | 'register';

export function AuthModal() {
  const { login }   = useAuth();
  const { toast }   = useToast();
  const [mode, setMode]           = useState<Mode>('login');
  const [phone, setPhone]         = useState('');
  const [password, setPassword]   = useState('');
  const [username, setUsername]   = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);

  const handleSubmit = async () => {
    if (!phone.trim() || !password.trim()) {
      toast({ title: 'Enter phone and password', variant: 'destructive' }); return;
    }
    if (mode === 'register' && !username.trim()) {
      toast({ title: 'Enter a username', variant: 'destructive' }); return;
    }

    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body     = mode === 'login'
        ? { phone, password }
        : { phone, password, username };

      const res  = await fetch(endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        toast({ title: data.error ?? 'Something went wrong', variant: 'destructive' });
        return;
      }

      login(data.token, data.userId, data.username);
    } catch {
      toast({ title: 'Network error. Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setPassword('');
    setUsername('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-card border border-border/60 rounded-2xl p-8 w-full max-w-sm shadow-2xl mx-4">

        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🚀</div>
          <h1 className="text-2xl font-bold font-display text-foreground">Shinda 24/7</h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time crash game</p>
        </div>

        <div className="flex gap-2 rounded-lg border border-border/50 p-1 mb-6">
          {(['login', 'register'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`flex-1 py-2 rounded-md text-sm font-medium capitalize transition-colors ${
                mode === m
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {m === 'login' ? 'Login' : 'Register'}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Phone Number
            </label>
            <Input
              placeholder="254712345678"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              className="h-12 text-base"
              type="tel"
            />
            <p className="text-xs text-muted-foreground">Format: 254XXXXXXXXX</p>
          </div>

          {mode === 'register' && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Username
              </label>
              <Input
                placeholder="JohnDoe123"
                value={username}
                onChange={e => setUsername(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                className="h-12 text-base"
                maxLength={32}
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <Input
                placeholder={mode === 'register' ? 'Min 6 characters' : 'Your password'}
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                className="h-12 text-base pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPass(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <Button
            className="w-full h-12 text-base mt-2"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading
              ? (mode === 'login' ? 'Logging in...' : 'Creating Account...')
              : (mode === 'login' ? 'Login' : 'Create Account')}
          </Button>
        </div>
      </div>
    </div>
  );
}
