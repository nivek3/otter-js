import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { ImplementationContext, ProxyUntypedServiceImplementation } from '@src/utils/context';

import { ProtoGrpcType } from '@src/__proto__/health';
import { HealthCheckRequest, HealthCheckResponse, HealthHandlers, ServingStatus } from '@src/__proto__/grpc/health/types';

const filename = path.join(__dirname, '../../../proto/health.proto');
const options = {
  longs: String,
  defaults: false,
  oneofs: true,
};
const packageDefinition = protoLoader.loadSync(filename, options);
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as unknown as ProtoGrpcType;

export const HealthService = protoDescriptor.grpc.health.v1.Health.service;

export const HealthImplementation: ProxyUntypedServiceImplementation<HealthHandlers> = {
  Check: function (ctx: ImplementationContext<HealthCheckRequest, HealthCheckResponse>) {
    ctx.body = {
      status: ServingStatus.SERVING,
    };
  },
};
