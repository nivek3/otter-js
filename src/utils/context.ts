import * as grpc from '@grpc/grpc-js';

export interface ImplementationContext<T, K> {
  call: grpc.ServerUnaryCall<T, K>;
  body: K;
  state: Record<string, any>;
}

export type GRpcInterceptor<T, K> = (ctx: ImplementationContext<T, K>) => void | Promise<void>;

export type ProxyUntypedServiceImplementation<I extends grpc.UntypedServiceImplementation> = {
  [K in keyof I]?: <T extends {}, K extends {}>(ctx: ImplementationContext<T, K>) => void | Promise<void>;
};
