import http from 'http';
import app from './app';
import { logger } from './lib/logger';
import { createWsServer, broadcast } from './lib/wsServer';
import { initBots, startBotRound } from './lib/bots';
import {
  initGameEngine,
  setBroadcast,
  generateHashChain,
  cleanupExpiredSessions,
  cleanupExpiredOtps,
} from '@workspace/db';

const rawPort = process.env['PORT'];

if (!rawPort) {
  throw new Error('PORT environment variable is required but was not provided.');
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = http.createServer(app);

createWsServer(server);

setBroadcast((event, data) => {
  broadcast(event, data);

  if (event === 'betting_open') {
    startBotRound();
  }
});

const runCleanup = async () => {
  try {
    const sessionCount = await cleanupExpiredSessions();
    const otpCount     = await cleanupExpiredOtps();
    if (sessionCount > 0 || otpCount > 0) {
      logger.info({ sessionCount, otpCount }, 'Cleanup: expired sessions/OTPs deleted');
    }
  } catch (err) {
    logger.error({ err }, 'Session cleanup failed');
  }
};

server.listen(port, async () => {
  logger.info({ port }, 'Server listening');

  try {
    const chain = generateHashChain(1000);
    logger.info({ chainLength: chain.length }, 'Hash chain generated');

    await initBots();
    await initGameEngine(chain);

    logger.info('Game engine initialized');

    runCleanup();
    setInterval(runCleanup, 6 * 60 * 60 * 1000);
  } catch (err) {
    logger.error({ err }, 'Failed to initialize game engine');
    process.exit(1);
  }
});

server.on('error', (err) => {
  logger.error({ err }, 'Server error');
  process.exit(1);
});
