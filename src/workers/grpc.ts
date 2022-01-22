import { grpcServer } from '@src/services/grpc';
import 'heapdump';

const services: Array<any> = [];

export const ClusteredApiWorker = async () => {
  process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection at:', error);
    stop();
  });
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);

  services.push(grpcServer);
  for (const service of services) {
    await service.start();
  }
};

const stop = async () => {
  console.log(`Shutting down ${process.pid}`);
  for (const service of services.reverse()) {
    await service.stop();
  }
  process.exit();
};
