import * as grpc from '@grpc/grpc-js';

export interface ImplContext<T, K> {
    call: grpc.ServerUnaryCall<T, K>,
    body: K,
    state: Record<string, any>,
} 

export type GRpcInterceptor<T, K> = (ctx: ImplContext<T, K>) => Promise<void>;