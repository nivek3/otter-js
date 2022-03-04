import bluebird from 'bluebird';
import logger from '@src/logger';

export interface GracefulService {
  readonly name: string;
  start?: (..._args: any) => Promise<any>;
  stop: (..._args: any) => Promise<any>;
}

/**
 * The gracefulExit will follow the sequence of services array
 */
export const gracefulExit = (services: GracefulService[], msWaitBeforeExit = 0) => {
  process.on('SIGINT', (SIGINT) => {
    logger.info(`SIGINT at: ${SIGINT}`);
    handleExit(SIGINT);
  });

  process.on('SIGTERM', (e) => {
    logger.info(`SIGTERM at: ${e}`);
    return handleExit(e);
  });

  process.on('uncaughtException', (e) => {
    logger.info(`Uncaught Exception at: ${e.stack || e}`);
    return handleExit(e);
  });

  process.on('unhandledRejection', (e: any) => {
    logger.info(`Uncaught Exception at: ${e}`);
    return handleExit(e);
  });

  async function handleExit(reason: string | Error) {
    if (reason instanceof Error) {
      logger.error(`prepare exit reason: ${reason.stack || reason}`);
    }

    logger.info(`process will exit after ${msWaitBeforeExit}ms, receive:`, reason);
    await bluebird.delay(msWaitBeforeExit);

    try {
      const start = new Date().getTime();
      for (const service of services) {
        logger.info(`Exiting ${service.name} ...`);
        await service.stop();
        logger.info(`${service.name} exited at ${new Date()}`);
      }
      const spent = new Date().getTime() - start;
      logger.info(`Graceful Exit time total spent ${spent} ms`);
      process.exit(0);
    } catch (e) {
      logger.error('Graceful exit error', e);
      process.exit(1);
    }
  }
};
