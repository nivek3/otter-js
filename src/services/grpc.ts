import 'dotenv/config';
import * as grpc from '@grpc/grpc-js';
import { LoggifyClass } from '@src/decorators/Loggify';
import { Middleware } from 'koa-compose';
import { ImplementationContext, ProxyUntypedServiceImplementation } from '@src/utils/context';
import { loggerInterceptor } from '@src/grpc/interceptors/logger';
import { GracefulService } from '@src/internal/exit';
import { GrpcInterceptorProxy } from '@src/grpc/internals/grpcInterceptor';
import {
  AvalancheAVAXService,
  AvalancheAVAXImplementation,
  EthereumCoreService,
  EthereumCoreImplementation,
  EthereumGnosisService,
  EthereumGnosisImplementation,
  HealthService,
  HealthImplementation,
  PolkadotService,
  PolkadotImplementation,
  BitcoinService,
  BitcoinImplementation,
  CosmosImplementation,
  CosmosService,
  RippleImplementation,
  RippleService,
  TronImplementation,
  TronService,
  SolanaImplementation,
  SolanaService,
} from '@src/grpc/services';

import logger from '@src/logger';

@LoggifyClass
export class GRPCServer extends GrpcInterceptorProxy implements GracefulService {
  name = 'GRPC Server';
  port: string;
  private server: grpc.Server;
  private serviceName: string;

  constructor(serviceName: string, GRPC_PORT: string) {
    super();
    this.interceptors = [];
    this.port = GRPC_PORT;
    this.serviceName = serviceName;
    const server = new grpc.Server({
      'grpc.keepalive_permit_without_calls': parseInt(process.env.GRPC_ARG_KEEPALIVE_PERMIT_WITHOUT_CALLS || '0'),
      'grpc.http2.max_pings_without_data': parseInt(process.env.GRPC_ARG_HTTP2_MAX_PINGS_WITHOUT_DATA || '2'),
    });
    this.server = this.proxy(server);
  }

  success(ctx: ImplementationContext<any, any>, callback: grpc.sendUnaryData<any>) {
    callback(null, ctx.body, ctx.call.metadata);
  }

  fail(err: grpc.StatusObject, callback: grpc.sendUnaryData<any>, ctx?: ImplementationContext<any, any>) {
    callback(err, err.details, err.metadata || ctx?.call.metadata);
  }

  addService(
    service: grpc.ServiceDefinition<grpc.UntypedServiceImplementation>,
    implementation: ProxyUntypedServiceImplementation<grpc.UntypedServiceImplementation>,
  ) {
    this.server.addService(service, implementation as any);
  }

  use(interceptor: Middleware<ImplementationContext<unknown, unknown>>) {
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
    await new Promise((resolve, reject) => {
      try {
        this.server.tryShutdown(resolve);
      } catch (error) {
        reject(error);
      }
    });
  }
}

const GRPC_SERVER_NAME = process.env.GRPC_SERVER_NAME || 'Wallet';
const GRPC_PORT = process.env.GRPC_PORT || '50051';

export const grpcServer = new GRPCServer(GRPC_SERVER_NAME, GRPC_PORT);

// services
grpcServer.addService(AvalancheAVAXService, AvalancheAVAXImplementation);
grpcServer.addService(BitcoinService, BitcoinImplementation);
grpcServer.addService(CosmosService, CosmosImplementation);
grpcServer.addService(EthereumCoreService, EthereumCoreImplementation);
grpcServer.addService(EthereumGnosisService, EthereumGnosisImplementation);
grpcServer.addService(HealthService, HealthImplementation);
grpcServer.addService(PolkadotService, PolkadotImplementation);
grpcServer.addService(RippleService, RippleImplementation);
grpcServer.addService(TronService, TronImplementation);
grpcServer.addService(SolanaService, SolanaImplementation);

// interceptors
grpcServer.use(loggerInterceptor);
