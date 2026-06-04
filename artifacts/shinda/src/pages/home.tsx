import { Sidebar }      from '@/components/layout/sidebar';
import { Topbar }       from '@/components/layout/topbar';
import { RightSidebar } from '@/components/layout/right-sidebar';
import { GameCanvas }   from '@/components/game/game-canvas';
import { GameControls } from '@/components/game/game-controls';
import { HistoryPanel } from '@/components/game/history-panel';
import { useAuth }       from '@/contexts/AuthContext';
import { useGameSocket } from '@/hooks/use-game-socket';

export default function Home() {
  const { token } = useAuth();
  const { gameState, activeBets, connected, send } = useGameSocket(token);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative z-10">
        <Topbar gameState={gameState} />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
            <GameCanvas gameState={gameState} />

            <GameControls
              gameState={gameState}
              activeBets={activeBets}
              connected={connected}
              send={send}
            />

            <HistoryPanel />
          </div>
          <div className="h-12" />
        </main>
      </div>

      <RightSidebar />
    </div>
  );
}
