import * as grpc from '@grpc/grpc-js';
import * as protobuf from 'protobufjs';
import crypto from 'crypto';

export interface ImplContext<T, K> {
  call: grpc.ServerUnaryCall<T, K>;
  body: K;
  state: Record<string, any>;
}

export type GRpcInterceptor<T, K> = (ctx: ImplContext<T, K>) => void | Promise<void>;

export type ProxyImp<I> = {
  [K in keyof I]?: <Q, S>(ctx: ImplContext<Q, S>) => void | Promise<void>;
};

export function signContext<T, K>(Message: protobuf.Message, ctx: ImplContext<T, K>) {
  const message = (Message as unknown as typeof protobuf.Message).create(ctx.body);
  const buffer = (Message as unknown as typeof protobuf.Message).encode(message).finish();
  const signature = Buffer.from(buffer).toString('hex');
  const first = crypto.createHash('sha256').update(signature).digest('hex');
  const twice = crypto.createHash('sha256').update(first).digest('hex');
  ctx.call.metadata.set('signature', twice);
}
