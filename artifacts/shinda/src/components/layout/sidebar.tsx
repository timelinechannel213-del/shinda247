import { memo } from "react";
import { Link, useLocation } from "wouter";
import { Home, Bell, History, Users, HelpCircle, Flame, UserCircle, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const NAV_ITEMS = [
  { href: "/",             label: "Home",          icon: Home },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/history",      label: "History",        icon: History },
  { href: "/players",      label: "Players",        icon: Users },
  { href: "/profile",      label: "Profile",        icon: UserCircle },
];

// ⚡ Bolt: Wrapped in React.memo to prevent re-rendering on 60fps game state updates in parent
export const Sidebar = memo(function Sidebar() {
  const [location] = useLocation();
  const { username, balanceCents, logout } = useAuth();

  return (
    <aside className="w-64 h-full hidden md:flex flex-col bg-card border-r border-border/50 z-20">
      <div className="h-20 flex items-center px-6 border-b border-border/50">
        <div className="flex items-center gap-2 text-primary font-display font-bold text-2xl tracking-tighter">
          <Flame className="w-8 h-8 fill-primary" />
          <span>SHINDA<span className="text-foreground">24/7</span></span>
        </div>
      </div>

      {username && (
        <div className="px-4 py-3 border-b border-border/50 bg-secondary/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
              {username.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold truncate">{username}</div>
              <div className="text-xs text-success font-mono">
                KES {(balanceCents / 100).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>
      )}

      <nav className="flex-1 py-4 px-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium",
                isActive
                  ? "bg-primary/10 text-primary border border-primary/20 shadow-[inset_0_0_20px_rgba(255,107,0,0.05)]"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive && "fill-primary/20")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 space-y-1 border-t border-border/50">
        <button className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-200 font-medium">
          <HelpCircle className="w-5 h-5" />
          Help & Support
        </button>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200 font-medium"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
});
