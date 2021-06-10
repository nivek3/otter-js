import * as grpc from '@grpc/grpc-js';
import protobuf from 'protobufjs';
import compose, { Middleware } from 'koa-compose';
import { ImplContext } from '../utils/context';
import { GRpcError } from './error';

export class GrpcInterceptorProxy {
  interceptors: Middleware<ImplContext<unknown, unknown>>[] = [];

  success<T, K>(ctx: ImplContext<T, K>, callback: grpc.sendUnaryData<unknown>) {
    callback(null, ctx.body, ctx.call.metadata);
  }

  fail<T, K>(err: grpc.ServiceError, callback: grpc.sendUnaryData<string>, ctx?: ImplContext<T, K>) {
    callback(err, err.message, ctx?.call.metadata);
  }

  proxy(server: grpc.Server) {
    const interceptors = this?.interceptors || [];
    const success = this.success;
    const fail = this.fail;
    return new Proxy(server, {
      get(target, propKey) {
        if (propKey !== 'addService') {
          return target[propKey];
        }
        return function <Q, S>(service: grpc.ServiceDefinition, implementation: Record<string, Middleware<unknown>>) {
          const newImplementation = {};
          for (const prop in implementation) {
            const originFn = implementation[prop];
            newImplementation[prop] = async function (call: grpc.ServerUnaryCall<Q, S>, callback: grpc.sendUnaryData<any>) {
              const ctx: ImplContext<Q, S> = {
                call,
                body: {} as S,
                state: {},
                signature: function (Message: protobuf.Message, data: object) {
                  const message = (Message as unknown as typeof protobuf.Message).create(data);
                  const buffer = (Message as unknown as typeof protobuf.Message).encode(message).finish();
                  return Buffer.from(buffer).toString('hex');
                },
              };
              try {
                await compose([...interceptors, originFn])(ctx);
                success(ctx, callback);
              } catch (err) {
                fail(err instanceof GRpcError ? err.toJSON() : err, callback, ctx);
              }
            };
          }
          return target.addService(service, newImplementation);
        };
      },
    });
  }
}
