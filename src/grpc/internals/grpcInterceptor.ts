import * as grpc from 'grpc';
import compose, { Middleware } from 'koa-compose';

import { ImplContext } from '../utils/context';

export class GrpcInterceptorProxy {
  interceptors: Middleware<unknown>[] = [];

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
  
  proxy(server: grpc.Server) {
    const interceptors = this?.interceptors || [];
    const success = this.success;
    const fail = this.fail;
    return new Proxy(server, {
      get(target, propKey) {
        if (propKey !== 'addService') {
          return target[propKey];
        }
        return function(service: grpc.Server, implementation: Record<string, Middleware<unknown>>) {
          const newImplementation = {};
          for (const prop in implementation) {
            const originFn = implementation[prop];
            newImplementation[prop] = async function (call: grpc.ServerUnaryCall<any>, callback: grpc.sendUnaryData<any>) {
              const ctx: ImplContext<any, any> = {
                call,
                body: {},
                state: {},
              };
              try {
                const run = compose([...interceptors, originFn]);
                await run(ctx);
                success(ctx, callback);
              } catch (err) {
                fail(err, callback, ctx);
              }
            };
          }
          return target.addService(service, newImplementation);
        };
      },
    });
  }
}
