import * as grpc from '@grpc/grpc-js';
import { ImplContext } from '../utils/context';

export interface GRpcErrorOptions {
  code: grpc.status;
  details: string;
  errno: string;
  ctx: ImplContext<any, any>;
}

export class GRpcError extends Error {
  message: string;
  code: grpc.status;
  details: string;
  metadata: grpc.Metadata;
  constructor({ code = grpc.status.INTERNAL, details, ctx, errno }: GRpcErrorOptions) {
    super(details);
    this.message = details;
    this.details = details;
    this.code = code;
    this.metadata = ctx.call.metadata;
    if (errno) {
      this.metadata?.set('errno', errno);
    }
  }

  toJSON(): grpc.StatusObject {
    return {
      code: this.code,
      details: this.message,
      metadata: this.metadata,
    };
  }
}
