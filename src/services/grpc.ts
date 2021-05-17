import 'dotenv/config';
import * as grpc from '@grpc/grpc-js';
import { LoggifyClass } from '../decorators/Loggify';
import { ImplContext } from '../grpc/utils/context';
import { loggerInterceptor } from '../grpc/interceptors/logger';
import { GrpcInterceptorProxy } from '../grpc/internals/grpcInterceptor';
import { accountService, accountImplementation } from '../grpc/services/account';
import { transactionService, transactionImplementation } from '../grpc/services/transaction';
import logger from '../logger';

@LoggifyClass
export class GRPCServer extends GrpcInterceptorProxy {
  name: string;
  port: string;
  private server: grpc.Server;
  private serviceName: string;

  constructor(serviceName: string, GRPC_PORT: string) {
    super();
    this.interceptors = [];
    this.name = 'gRPC Server';
    this.port = GRPC_PORT;
    this.serviceName = serviceName;
    const server = new grpc.Server({
      'grpc.keepalive_permit_without_calls': parseInt(process.env.GRPC_ARG_KEEPALIVE_PERMIT_WITHOUT_CALLS || '0'),
      'grpc.http2.max_pings_without_data': parseInt(process.env.GRPC_ARG_HTTP2_MAX_PINGS_WITHOUT_DATA || '2'),
    });
    this.server = this.proxy(server);
  }

  success(ctx: ImplContext<any, any>, callback: grpc.sendUnaryData<any>) {
    callback(null, ctx.body, ctx.call.metadata);
  }

  fail(err: grpc.StatusObject, callback: grpc.sendUnaryData<any>, ctx?: ImplContext<any, any>) {
    callback(err, err.details, err.metadata || ctx?.call.metadata);
  }

  addService(service: grpc.ServiceDefinition<grpc.UntypedServiceImplementation>, implementation: Record<string, Function>) {
    this.server.addService(service, implementation as any);
  }

  use(interceptor: any) {
    this.interceptors.push(interceptor);
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.bindAsync(`0.0.0.0:${this.port}`, grpc.ServerCredentials.createInsecure(), () => {
        logger.info(`🚀 ${this.serviceName} server ready at port ${this.port}, pid ${process.pid}`);
        this.server.start();
        resolve();
      });
    });
  }

  async stop() {
    return new Promise((resolve, reject) => {
      try {
        this.server.tryShutdown(resolve);
      } catch (error) {
        reject(error);
      }
    });
  }
}

if (!Number.parseInt(process.env.GRPC_PORT || '', 10)) {
  throw new Error('Unknown grpc port');
}
const GRPC_SERVER_NAME = process.env.GRPC_SERVER_NAME || 'Wallet';
export const grpcServer = new GRPCServer(GRPC_SERVER_NAME, process.env.GRPC_PORT as string);
grpcServer.addService(accountService, accountImplementation);
grpcServer.addService(transactionService, transactionImplementation);

grpcServer.use(loggerInterceptor);
