import { createHash, randomBytes } from 'crypto';

const HOUSE_EDGE = 0.01; // 1% house edge

/**
 * Generate a cryptographically secure random seed for the genesis game.
 */
export function generateGenesisSeed(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Derive the next game hash from the previous game's hash.
 * Chain: SHA256(prevHash as UTF-8 string) = this game's hash
 */
export function deriveNextHash(currentHash: string): string {
  return createHash('sha256').update(currentHash, 'utf8').digest('hex');
}

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
export function computeCrashPoint(hash: string): number {
  const E = 2 ** 52;
  const h = parseInt(hash.substring(0, 13), 16);

  // House edge: 1 in 33 games instant bust at 1.00x (~3.03% instant bust rate)
  if (h % 33 === 0) return 100; // 1.00x

  const crashFloat = Math.floor((100 * E - h) / (E - h)) / 100;
  const crashX100  = Math.floor(Math.max(1.00, crashFloat) * 100);

  return crashX100;
}

/**
 * Verify a game's crash point from its published hash.
 */
export function verifyGame(hash: string, reportedCrashX100: number): boolean {
  return computeCrashPoint(hash) === reportedCrashX100;
}

/**
 * Verify the chain link between two consecutive games.
 */
export function verifyChainLink(currentHash: string, prevHash: string): boolean {
  return deriveNextHash(currentHash) === prevHash;
}

/**
 * Generate a full batch of upcoming game hashes.
 * Chain runs BACKWARDS — index 0 is the first game to play.
 */
export function generateHashChain(count: number = 1000): string[] {
  const genesis = generateGenesisSeed();
  const chain: string[] = [];
  let current = genesis;
  for (let i = 0; i < count; i++) {
    current = deriveNextHash(current);
    chain.push(current);
  }
  return chain.reverse();
}

/**
 * Get elapsed time in ms for a given crash multiplier.
 * Formula: elapsed = ln(crash) * K   where K = 35000ms
 */
export function crashPointToElapsed(crashX100: number): number {
  const crash = crashX100 / 100;
  const K = 35000;
  return Math.round(Math.log(crash) * K);
}

/**
 * Compute multiplier from elapsed time.
 * multiplier = e^(elapsed / K)
 */
export function elapsedToMultiplier(elapsedMs: number): number {
  const K = 35000;
  return Math.round(Math.exp(elapsedMs / K) * 100) / 100;
}
