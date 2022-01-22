import { StatusObject, status as Status, Metadata } from '@grpc/grpc-js';
import type { ImplContext } from '@src/utils/context';

export interface ErrorOptions {
  code: Status;
  status: number;
  details: string;
  errno: string;
  metadata?: Metadata;
}

export type ExcludeMetadata = Omit<StatusObject, 'metadata'>;
export type ErrorObject = StatusObject & ErrorOptions;

export class AppError extends Error {
  status: number;
  code: number;
  errno: string;
  details: string;
  constructor(options: ErrorOptions, extra?: Partial<ErrorOptions>) {
    options = Object.assign({}, options, extra);

    super(options.details);

    this.status = options.status;
    this.code = options.code;
    this.errno = options.errno;
    this.details = options.details;
  }

  toJSON(ctx?: ImplContext<unknown, unknown>): Omit<ErrorObject, 'ctx'> {
    const metadata = ctx?.call.metadata;
    return {
      code: this.code,
      status: this.status,
      errno: this.errno,
      details: this.message,
      metadata: metadata!,
    };
  }
}
