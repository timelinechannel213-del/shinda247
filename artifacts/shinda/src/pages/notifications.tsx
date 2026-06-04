import { Sidebar } from "@/components/layout/sidebar";
import { useGetGameHistory } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { Bell, Zap, Trophy, TrendingUp, Info } from "lucide-react";

export default function NotificationsPage() {
  const { data: history } = useGetGameHistory({ limit: 20 }, { query: { refetchInterval: 10000 } });

  const notifications = history?.map((round, i) => {
    const crash = round.crashedAt;
    let icon = Info;
    let color = "text-muted-foreground";
    let bg = "bg-secondary/30";
    let title = `Round #${round.id} ended at ${crash.toFixed(2)}x`;
    let message = "The rocket has landed.";

    if (crash >= 10) {
      icon = Trophy;
      color = "text-yellow-400";
      bg = "bg-yellow-500/10";
      title = `Mega crash at ${crash.toFixed(2)}x!`;
      message = "High multiplier round — big wins for those who cashed out!";
    } else if (crash >= 5) {
      icon = TrendingUp;
      color = "text-success";
      bg = "bg-success/10";
      title = `Big round! Crashed at ${crash.toFixed(2)}x`;
      message = "Decent multiplier — good cashout opportunity.";
    } else if (crash >= 2) {
      icon = Zap;
      color = "text-warning";
      bg = "bg-warning/10";
      title = `Round #${round.id} crashed at ${crash.toFixed(2)}x`;
      message = "Moderate round. Stay alert!";
    } else {
      color = "text-destructive";
      bg = "bg-destructive/10";
      title = `Early crash at ${crash.toFixed(2)}x`;
      message = `Round #${round.id} crashed early. Better luck next time.`;
    }

    return { id: round.id, icon, color, bg, title, message, time: round.createdAt };
  }) ?? [];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <div className="h-20 flex items-center px-6 border-b border-border/50 bg-card shrink-0">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-display font-bold">Notifications</h1>
            {notifications.length > 0 && (
              <span className="ml-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                {notifications.length}
              </span>
            )}
          </div>
        </div>

        <main className="flex-1 overflow-y-auto p-6">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center">
                <Bell className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-display font-bold">No notifications yet</h3>
              <p className="text-muted-foreground">Game round results will appear here as they happen.</p>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-3">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn("flex items-start gap-4 p-4 rounded-2xl border border-border/30", n.bg)}
                >
                  <div className={cn("mt-0.5 shrink-0", n.color)}>
                    <n.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("font-bold text-sm", n.color)}>{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(n.time).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
