import 'heapdump';
import { api } from '@src/services/api';
import { grpcServer } from '@src/services/grpc';
import logger from '@src/logger';
import { gracefulExit } from '@src/internal/exit';

async function bootstrap() {
  try {
    await api.start();
    await grpcServer.start();

    gracefulExit([api, grpcServer]);
    logger.info(`🚀 Start servers succeed : ${new Date()}`);
  } catch (error) {
    logger.error('Start servers failed. ', error);
  }
}

bootstrap();
