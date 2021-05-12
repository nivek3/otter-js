import * as http from 'http';
import app from '../routes';
import logger from '../logger';
import config from '../config';
import { LoggifyClass } from '../decorators/Loggify';
import { ConfigService, Config } from './config';

@LoggifyClass
export class ApiService {
  port: number;
  timeout: number;
  configService: ConfigService;
  httpServer: http.Server;
  stopped = true;

  constructor({
    port = 3000,
    timeout = 600000,
    configService = Config,
  } = {}) {
    this.port = port;
    this.timeout = timeout;
    this.configService = configService;
    this.httpServer = new http.Server(app);
  }

  async start() {
    if (this.configService.isDisabled('api')) {
      logger.info(`Disabled API Service`);
      return;
    }
    if (this.stopped) {
      this.stopped = false;
      this.httpServer.timeout = this.timeout;
      this.httpServer.listen(this.port, () => {
        logger.info(`Starting API Service on port ${this.port}`);
      });
    }
    return this.httpServer;
  }

  stop() {
    this.stopped = true;
    return new Promise(resolve => {
      this.httpServer.close(resolve);
    });
  }
}

// TOOO: choose a place in the config for the API timeout and include it here
export const Api = new ApiService({
  port: config.port
});
