export type GamePhase = 'waiting' | 'betting' | 'flying' | 'crashed';
export interface GameState {
    id: number;
    hash: string;
    state: GamePhase;
    crashPoint: number | null;
    elapsedMs: number;
    playerCount: number;
    totalBetsCents: number;
}
export interface ActiveBet {
    userId: number;
    username: string;
    amountCents: number;
    autoCashoutAt: number | null;
    cashedOutAt: number | null;
}
type EventHandler = (event: string, data: unknown) => void;
export declare function setBroadcast(fn: EventHandler): void;
export declare function getCurrentGame(): GameState | null;
export declare function getActiveBets(): ActiveBet[];
export declare function getRecentGames(limit?: number): Promise<{
    id: number;
    hash: string;
    prevHash: string | null;
    crashPoint: number | null;
    state: "waiting" | "betting" | "flying" | "crashed";
    bettingOpenAt: Date | null;
    bettingCloseAt: Date | null;
    flyingStartAt: Date | null;
    crashedAt: Date | null;
    elapsedMs: number | null;
    totalBetsCents: number;
    totalPayoutCents: number;
    playerCount: number;
    forced: boolean;
    createdAt: Date;
}[]>;
export declare function initGameEngine(chain: string[]): Promise<void>;
export declare function placeBet(userId: number, username: string, amountCents: number, autoCashoutAt: number | null): Promise<{
    success: boolean;
    error?: string;
    betId?: number;
}>;
export declare function processCashout(userId: number, gameId: number, _requestedMultX100?: number): Promise<{
    success: boolean;
    payoutCents?: number;
    error?: string;
}>;
export {};
//# sourceMappingURL=game.engine.d.ts.map