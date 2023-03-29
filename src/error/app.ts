import { StatusObject, status as Status, Metadata, MetadataValue } from '@grpc/grpc-js';

import type { ImplementationContext } from '@src/utils/context';
import { errors } from './errors';

export interface ErrorOptions {
  code: Status;
  details: string;
  status: number;
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

  static from(err: any) {
    if (err instanceof AppError) return err;

    const options = Object.assign({}, errors.INTERNAL, { details: err.message || err });
    // ethers.js error
    if (err.reason && err.code) {
      const details: string = err.reason;
      if (details.startsWith('execution reverted:')) {
        Object.assign(options, errors.EXECUTION_REVERTED, { details });
      } else {
        Object.assign(options, errors.ETHERS_REVERTED, { details });
      }
    }
    return new AppError(options);
  }

  display(ctx?: ImplementationContext<unknown, unknown>): Omit<ErrorObject, 'ctx' | 'metadata'> {
    const description: Omit<ErrorObject, 'ctx' | 'metadata'> = {
      status: this.status,
      details: this.message,
      code: this.code,
      errno: this.errno,
    };
    if (ctx?.call.metadata) {
      Object.keys(description).forEach((key) => {
        if (!description[key]) return;
        ctx.call.metadata.set(key, this.normalizeMetadataValue(description[key]));
      });
    }
    return description;
  }

  normalizeMetadataValue(value: number | string): MetadataValue {
    const normalized = value.toString();
    return normalized
      .replace(/[\n\r]/g, ',') // replace new line and carriage return with comma
      .replace(/[^ -~]/g, ''); // remove non-printable ASCII characters
  }
}
