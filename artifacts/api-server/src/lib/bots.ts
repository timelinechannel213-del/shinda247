import { db } from '@workspace/db';
import { users, wallets } from '@workspace/db';
import { eq } from 'drizzle-orm';
import { placeBet, processCashout, getCurrentGame } from '@workspace/db';
import { logger } from './logger';

const BOT_NAMES = [
  'Peterode', 'lagatsa', 'Brandd', 'Serrias', 'yegoro',
  'Johndo', 'Ourmae', 'Peterdc', 'kevinge', 'mutuah',
  'Wanjiru', 'Kamau', 'Ochieng', 'Akinyi', 'Mutua',
  'Njoroge', 'Maina', 'Otieno', 'Waweru', 'Kariuki',
];

interface BotState {
  userId: number;
  username: string;
}

let bots: BotState[] = [];
let bettingListener: ((event: string, data: unknown) => void) | null = null;

async function ensureBotUser(username: string): Promise<BotState | null> {
  const phone = `254${String(BOT_NAMES.indexOf(username) + 700_000_000).padStart(9, '0')}`;

  try {
    let [user] = await db
      .select({ id: users.id, username: users.username })
      .from(users)
      .where(eq(users.username, username));

    if (!user) {
      [user] = await db.insert(users).values({
        phone,
        username,
        isActive: true,
      }).returning({ id: users.id, username: users.username });

      await db.insert(wallets).values({
        userId:       user.id,
        balanceCents: 500_000,
      });
    } else {
      const [wallet] = await db
        .select({ balanceCents: wallets.balanceCents })
        .from(wallets)
        .where(eq(wallets.userId, user.id));

      if (!wallet) {
        await db.insert(wallets).values({ userId: user.id, balanceCents: 500_000 });
      } else if (wallet.balanceCents < 10_000) {
        await db.update(wallets)
          .set({ balanceCents: 500_000 })
          .where(eq(wallets.userId, user.id));
      }
    }

    return { userId: user.id, username: user.username };
  } catch (err) {
    logger.error({ err, username }, 'Failed to ensure bot user');
    return null;
  }
}

export async function initBots(): Promise<void> {
  logger.info('Initializing bots...');

  const botUsers = await Promise.all(BOT_NAMES.map(ensureBotUser));
  bots = botUsers.filter((b): b is BotState => b !== null);

  logger.info({ count: bots.length }, 'Bots ready');
}

export function startBotRound(): void {
  const game = getCurrentGame();
  if (!game || game.state !== 'betting') return;

  const numBots = Math.floor(Math.random() * 8) + 4;
  const shuffled = [...bots].sort(() => Math.random() - 0.5).slice(0, numBots);

  for (const bot of shuffled) {
    const delay = Math.random() * 3000;
    setTimeout(async () => {
      try {
        const amounts = [100, 200, 500, 1000, 2000, 5000];
        const amountCents = amounts[Math.floor(Math.random() * amounts.length)]!;

        const willAutoCashout = Math.random() < 0.4;
        const autoCashoutAt   = willAutoCashout
          ? Math.floor((Math.random() * 8 + 1.2) * 100)
          : null;

        await placeBet(bot.userId, bot.username, amountCents, autoCashoutAt);
      } catch {}
    }, delay);
  }

  for (const bot of shuffled) {
    if (Math.random() < 0.5) {
      const cashoutDelay = Math.random() * 8000 + 1500;
      setTimeout(async () => {
        try {
          const g = getCurrentGame();
          if (!g || g.state !== 'flying') return;
          await processCashout(bot.userId, g.id);
        } catch {}
      }, 5000 + cashoutDelay);
    }
  }
}
