import * as grpc from 'grpc';

export interface ImplContext<T, K> {
    call: grpc.ServerUnaryCall<T>,
    body: K,
    state: Record<string, any>,
} 

export type GRpcInterceptor<T, K> = (ctx: ImplContext<T, K>) => Promise<void>;