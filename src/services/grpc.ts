import 'dotenv/config';
import * as grpc from 'grpc';
import { LoggifyClass } from '../decorators/Loggify';
import { ImplContext } from '../grpc/utils/context';
import { loggerInterceptor } from '../grpc/interceptors/logger';
import { GrpcInterceptorProxy } from '../grpc/internals/grpcInterceptor';
import { accountService, accountImplementation } from '../grpc/services/account';
import { transactionService, transactionImplementation } from '../grpc/services/transaction';

@LoggifyClass
export class GRPCServer extends GrpcInterceptorProxy {
  name: string;
  private server: grpc.Server;
  private serviceName: string;

  constructor(serviceName: string) {
    super();
    this.interceptors = [];
    this.name = 'gRPC Server';
    this.serviceName = serviceName;
    const server = new grpc.Server({
      'grpc.keepalive_permit_without_calls': parseInt(process.env.GRPC_ARG_KEEPALIVE_PERMIT_WITHOUT_CALLS || '0'),
      'grpc.http2.max_pings_without_data': parseInt(process.env.GRPC_ARG_HTTP2_MAX_PINGS_WITHOUT_DATA || '2'),
    });
    this.server = this.proxy(server);
  }

  success(ctx: ImplContext<any, any>, callback: grpc.sendUnaryData<any>) {
    callback(null, { data: ctx.body });
  }

  fail(err: any, callback: grpc.sendUnaryData<any>, ctx?: ImplContext<any, any>) {
    callback(null, {
      error: {
        requestId: ctx?.state?.requestId,
        code: err.code,
        msg: err.message,
        detail: err.detail || err,
      },
    });
  }

  addService(service: grpc.ServiceDefinition<grpc.UntypedServiceImplementation>, implementation: Record<string, Function>) {
    this.server.addService(service, implementation);
  }

  use(interceptor: any) {
    this.interceptors.push(interceptor);
  }

  start(port: string) {
    this.server.bind(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure());
    this.server.start();
    console.log(`🚀 ${this.serviceName} server ready at port ${port}, pid ${process.pid}`);
  }

  async stop() {
    return new Promise<void>((resolve, reject) => {
      try {
        this.server.tryShutdown(resolve);
      } catch (error) {
        reject(error);
      }
    });
  }
}

const GRPC_PORT = process.env.GRPC_PORT || '3309';
const GRPC_SERVER_NAME = process.env.GRPC_SERVER_NAME || 'Wallet';
export const grpcServer = new GRPCServer(GRPC_SERVER_NAME);
grpcServer.addService(accountService, accountImplementation);
grpcServer.addService(transactionService, transactionImplementation);

grpcServer.use(loggerInterceptor);

grpcServer.start(GRPC_PORT);
