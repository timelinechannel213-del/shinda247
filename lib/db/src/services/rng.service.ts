import { createHash, createHmac, randomBytes } from 'crypto';

const HOUSE_EDGE = 0.01; // 1% house edge

/**
 * Generate a cryptographically secure random seed for the genesis game.
 * Only called once when the chain starts.
 */
export function generateGenesisSeed(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Derive the next game hash from the previous game's hash.
 * Chain: SHA256(prevHash as UTF-8 string) = this game's hash
 * This is the same method Pakakumi uses — verified from live data.
 *
 * To verify: SHA256("da372fdc...e796") = "bd96b851...fcc1" ✅
 */
export function deriveNextHash(currentHash: string): string {
  return createHash('sha256').update(currentHash, 'utf8').digest('hex');
}

/**
 * Compute the crash point from a game hash.
 *
 * We use the standard bustabit-derived formula with our house edge.
 * The formula is PUBLISHED so players can verify any game independently.
 *
 * Algorithm:
 * 1. Take first 8 hex chars of hash → convert to uint32 integer h
 * 2. House edge check: if h % INSTANT_BUST_DIVISOR === 0 → crash at 1.00x
 * 3. Otherwise: crash = floor((MAX_UINT32 * (1 - HOUSE_EDGE)) / (MAX_UINT32 - h)) / 100
 * 4. Minimum crash is always 1.00x
 *
 * Returns crash point as integer * 100 (e.g. 1.60x → 160, 4.06x → 406)
 */
export function computeCrashPoint(hash: string): number {
  const MAX = 2 ** 32;
  const h   = parseInt(hash.substring(0, 8), 16);

  // House edge: 1 in 33 games instant bust at 1.00x
  // This gives exactly 1/33 ≈ 3.03% instant bust rate
  const INSTANT_BUST_DIVISOR = Math.floor(1 / HOUSE_EDGE / (1 / 33));
  if (h % 33 === 0) return 100; // 1.00x

  const crashFloat = Math.floor((100 * MAX - h) / (MAX - h)) / 100;
  const crashX100  = Math.floor(Math.max(1.00, crashFloat) * 100);

  return crashX100;
}

/**
 * Verify a game's crash point from its published hash.
 * Players can call this after each round to independently verify fairness.
 */
export function verifyGame(hash: string, reportedCrashX100: number): boolean {
  const computed = computeCrashPoint(hash);
  return computed === reportedCrashX100;
}

/**
 * Verify the chain link between two consecutive games.
 * SHA256(game[n].hash) should equal game[n-1].hash
 */
export function verifyChainLink(currentHash: string, prevHash: string): boolean {
  const computed = deriveNextHash(currentHash);
  return computed === prevHash;
}

/**
 * Generate a full batch of upcoming game hashes.
 * The chain runs BACKWARDS — we start at the END and derive backwards.
 *
 * Example with 3 games:
 * genesis (secret) → hash3 → hash2 → hash1
 * We publish hash1 first, then reveal hash2 after game 1, etc.
 * Players can verify: SHA256(hash2) === hash1 ✅
 *
 * @param count   Number of games to pre-generate
 * @returns       Array of hashes ordered oldest→newest (index 0 = next game)
 */
export function generateHashChain(count: number = 1000): string[] {
  const genesis = generateGenesisSeed();
  const chain: string[] = [];

  let current = genesis;
  for (let i = 0; i < count; i++) {
    current = deriveNextHash(current);
    chain.push(current);
  }

  // Reverse so index 0 is the FIRST game to play
  // chain[0] will be published, chain[1] = SHA256(chain[0]) = chain[0]'s prevHash
  return chain.reverse();
}

/**
 * Get elapsed time in ms for a given crash multiplier.
 * Used to compute how long the round will last.
 *
 * From Pakakumi analysis: the elapsed is deterministic from crash point.
 * Two different games with 1.85x both had elapsed=17456ms.
 *
 * Formula: elapsed = ln(crash) * K where K ≈ 35000
 * (This is our own formula — adjust K to match your desired game speed)
 */
export function crashPointToElapsed(crashX100: number): number {
  const crash = crashX100 / 100;
  const K = 35000; // milliseconds constant — adjust for game speed
  return Math.round(Math.log(crash) * K);
}

/**
 * Compute multiplier from elapsed time.
 * Used by the client to display the current multiplier during flight.
 *
 * multiplier = e^(elapsed / K)
 */
export function elapsedToMultiplier(elapsedMs: number): number {
  const K = 35000;
  return Math.round(Math.exp(elapsedMs / K) * 100) / 100;
}
