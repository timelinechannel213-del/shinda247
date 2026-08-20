import { useState } from 'react';
import { Sidebar }      from '@/components/layout/sidebar';
import { Topbar }       from '@/components/layout/topbar';
import { RightSidebar } from '@/components/layout/right-sidebar';
import { BottomNav }    from '@/components/layout/bottom-nav';
import { GameCanvas }   from '@/components/game/game-canvas';
import { GameControls } from '@/components/game/game-controls';
import { HistoryPanel } from '@/components/game/history-panel';
import { useAuth }       from '@/contexts/AuthContext';
import { useGameSocket } from '@/hooks/use-game-socket';

interface WinFlash {
  payoutCents: number;
  multiplier: number;
}

export default function Home() {
  const { token } = useAuth();
  const { gameState, activeBets, connected, send, countdown } = useGameSocket(token);
  const [winFlash, setWinFlash] = useState<WinFlash | null>(null);

  const handleWin = (flash: WinFlash) => {
    setWinFlash(flash);
    setTimeout(() => setWinFlash(null), 1500);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative z-10">
        <Topbar />

        <main className="flex-1 overflow-y-auto p-3 md:p-6 space-y-4 md:space-y-6 pb-20 md:pb-6">
          <div className="flex flex-col gap-4 md:gap-6 max-w-5xl mx-auto w-full">
            <GameCanvas gameState={gameState} countdown={countdown} winFlash={winFlash} />

            <GameControls
              gameState={gameState}
              activeBets={activeBets}
              connected={connected}
              send={send}
              onWin={handleWin}
            />

            <HistoryPanel />
          </div>
        </main>
      </div>

      <RightSidebar />
      <BottomNav />
    </div>
  );
}
