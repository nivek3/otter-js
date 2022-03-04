import 'dotenv/config';
import * as http from 'http';

import app from '@src/rest';
import logger from '@src/logger';
import { LoggifyClass } from '@src/decorators/Loggify';
import { GracefulService } from '@src/internal/exit';
@LoggifyClass
export class ApiService implements GracefulService {
  name = 'API Service';
  port: number;
  timeout: number;
  httpServer: http.Server;
  stopped = true;

  constructor({ port = 3000, timeout = 600000 } = {}) {
    this.port = port;
    this.timeout = timeout;
    this.httpServer = new http.Server(app);
  }

  async start() {
    if (this.stopped) {
      this.stopped = false;
      this.httpServer.timeout = this.timeout;
      this.httpServer.listen(this.port, () => {
        logger.info(`🚀 Starting API Service on port ${this.port}`);
      });
    }
    return this.httpServer;
  }

  async stop() {
    this.stopped = true;
    await new Promise((resolve) => {
      this.httpServer.close(resolve);
    });
  }
}

// TODO: choose a place in the config for the API timeout and include it here
export const api = new ApiService({
  port: process.env.PORT ? Number.parseInt(process.env.PORT, 10) : undefined,
});
