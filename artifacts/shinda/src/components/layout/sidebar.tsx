import { Link, useLocation } from "wouter";
import { Home, Bell, History, Users, HelpCircle, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/history", label: "History", icon: History },
  { href: "/players", label: "Players", icon: Users },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-64 h-full hidden md:flex flex-col bg-card border-r border-border/50 z-20">
      <div className="h-20 flex items-center px-6 border-b border-border/50">
        <div className="flex items-center gap-2 text-primary font-display font-bold text-2xl tracking-tighter">
          <Flame className="w-8 h-8 fill-primary" />
          <span>SHINDA<span className="text-foreground">24/7</span></span>
        </div>
      </div>

      <nav className="flex-1 py-6 px-4 space-y-2">
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

      <div className="p-4 mt-auto">
        <button className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-200 font-medium">
          <HelpCircle className="w-5 h-5" />
          Help & Support
        </button>
      </div>
    </aside>
  );
}
