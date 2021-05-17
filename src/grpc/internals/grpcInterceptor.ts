import * as grpc from '@grpc/grpc-js';
import compose, { Middleware } from 'koa-compose';
import { ImplContext } from '../utils/context';
import { GRpcError } from './error';

export class GrpcInterceptorProxy {
  interceptors: Middleware<unknown>[] = [];

  success(ctx: ImplContext<any, any>, callback: grpc.sendUnaryData<any>) {
    callback(null, ctx.body, ctx.call.metadata);
  }

  fail(err: grpc.ServiceError, callback: grpc.sendUnaryData<any>, ctx?: ImplContext<any, any>) {
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
        return function(service: grpc.ServiceDefinition, implementation: Record<string, Middleware<unknown>>) {
          const newImplementation = {};
          for (const prop in implementation) {
            const originFn = implementation[prop];
            newImplementation[prop] = async function (call: grpc.ServerUnaryCall<any, any>, callback: grpc.sendUnaryData<any>) {
              const ctx: ImplContext<any, any> = {
                call,
                body: {},
                state: {},
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
