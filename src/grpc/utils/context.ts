import * as grpc from '@grpc/grpc-js';
import * as protobuf from 'protobufjs';

export interface ImplContext<T, K> {
  call: grpc.ServerUnaryCall<T, K>;
  body: K;
  state: Record<string, any>;
  signature: (Message: protobuf.Message, data: object) => string;
}

export type GRpcInterceptor<T, K> = (ctx: ImplContext<T, K>) => void | Promise<void>;

export type ProxyImp<I> = {
  [K in keyof I]?: <Q, S>(ctx: ImplContext<Q, S>) => void | Promise<void>;
};
