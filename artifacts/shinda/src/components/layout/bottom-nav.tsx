import { memo } from 'react';
import { Link, useLocation } from 'wouter';
import { Home, Bell, History, Users, UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/',              label: 'Home',    icon: Home },
  { href: '/history',       label: 'History', icon: History },
  { href: '/players',       label: 'Players', icon: Users },
  { href: '/notifications', label: 'Alerts',  icon: Bell },
  { href: '/profile',       label: 'Profile', icon: UserCircle },
];

// Memoize BottomNav to avoid re-renders during high-frequency parent state changes
export const BottomNav = memo(function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border/50 backdrop-blur-sm">
      <div className="flex items-center justify-around px-2 py-1 safe-area-inset-bottom">
        {NAV_ITEMS.map(item => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors min-w-0',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <item.icon className={cn('w-5 h-5', isActive && 'fill-primary/20')} />
              <span className="text-[10px] font-bold">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
});
