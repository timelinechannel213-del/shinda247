/**
 * Generate a cryptographically secure random seed for the genesis game.
 */
export declare function generateGenesisSeed(): string;
/**
 * Derive the next game hash from the previous game's hash.
 * Chain: SHA256(prevHash as UTF-8 string) = this game's hash
 */
export declare function deriveNextHash(currentHash: string): string;
/**
 * Compute the crash point from a game hash.
 *
 * Uses 2^52 (13 hex chars) for uniform distribution across the full
 * multiplier range — far better than 2^32 which over-represented low crashes.
 *
 * Algorithm:
 * 1. Take first 13 hex chars → convert to integer h (52-bit)
 * 2. House edge check: if h % 33 === 0 → crash at 1.00x (~3% of games)
 * 3. crash = floor((100 * E - h) / (E - h)) / 100   where E = 2^52
 * 4. Minimum crash is always 1.00x
 *
 * Returns crash point as integer * 100 (e.g. 1.60x → 160, 4.06x → 406)
 */
export declare function computeCrashPoint(hash: string): number;
/**
 * Verify a game's crash point from its published hash.
 */
export declare function verifyGame(hash: string, reportedCrashX100: number): boolean;
/**
 * Verify the chain link between two consecutive games.
 */
export declare function verifyChainLink(currentHash: string, prevHash: string): boolean;
/**
 * Generate a full batch of upcoming game hashes.
 * Chain runs BACKWARDS — index 0 is the first game to play.
 */
export declare function generateHashChain(count?: number): string[];
/**
 * Get elapsed time in ms for a given crash multiplier.
 * Formula: elapsed = ln(crash) * K   where K = 35000ms
 */
export declare function crashPointToElapsed(crashX100: number): number;
/**
 * Compute multiplier from elapsed time.
 * multiplier = e^(elapsed / K)
 */
export declare function elapsedToMultiplier(elapsedMs: number): number;
//# sourceMappingURL=rng.service.d.ts.map