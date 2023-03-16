import * as grpc from '@grpc/grpc-js';
import compose, { Middleware } from 'koa-compose';
import { ImplementationContext } from '@src/utils/context';
import { AppError } from '@src/error';
export class GrpcInterceptorProxy {
  interceptors: Middleware<ImplementationContext<unknown, unknown>>[] = [];

  proxy(server: grpc.Server) {
    const interceptors = this?.interceptors || [];
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
              const ctx: ImplementationContext<Q, S> = {
                call,
                body: {} as S,
                state: {},
              };
              try {
                await compose([...interceptors, originFn])(ctx);
                callback(null, ctx.body, ctx.call.metadata);
              } catch (err: any) {
                const error = AppError.from(err);
                error.display(ctx);
                callback(error, error.message, ctx?.call.metadata);
              }
            };
          }
          return target.addService(service, newImplementation);
        };
      },
    });
  }
}
