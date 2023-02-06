import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

import { provider } from '@src/providers/chain-state/avalanche/avax';
import { ImplementationContext, ProxyUntypedServiceImplementation } from '@src/utils/context';

import { ProtoGrpcType } from '@src/__proto__/avax';
import { TransactionReply } from '@src/__proto__/common/types';
import {
  AvalancheHandlers,
  DeployAccountRequest,
  DeployAccountReply,
  DecodeTransactionRequest,
  BuildAVAXTransferTransactionRequest,
  SignTransactionRequest,
  SendTransactionRequest,
  TransactionParams,
} from '@src/__proto__/avalanche/avax/types';

const filename = path.join(__dirname, '../../../../proto/avalanche/avax.proto');
const options = {
  longs: String,
  defaults: false,
  oneofs: true,
};
const packageDefinition = protoLoader.loadSync(filename, options);
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as unknown as ProtoGrpcType;

export const AvalancheAVAXService = protoDescriptor.avalanche.avax.Avalanche.service;

export const AvalancheAVAXImplementation: ProxyUntypedServiceImplementation<AvalancheHandlers> = {
  DeployAccount: function (ctx: ImplementationContext<DeployAccountRequest, DeployAccountReply>) {
    const req = ctx.call.request;
    const address = provider.deployAccount(req);
    ctx.body = { address };
  },

  BuildAVAXTransferTransaction: async function (
    ctx: ImplementationContext<BuildAVAXTransferTransactionRequest, TransactionReply>,
  ): Promise<void> {
    const req = ctx.call.request;
    ctx.body = await provider.buildAVAXTransferTransaction(req);
  },

  SignTransaction: async function (ctx: ImplementationContext<SignTransactionRequest, TransactionReply>): Promise<void> {
    const req = ctx.call.request;
    ctx.body = await provider.signTransaction(req);
  },

  SendTransaction: async function (ctx: ImplementationContext<SendTransactionRequest, TransactionReply>): Promise<void> {
    const req = ctx.call.request;
    ctx.body = await provider.sendTransaction(req);
  },

  DecodeTransaction: async function (ctx: ImplementationContext<DecodeTransactionRequest, TransactionParams>): Promise<void> {
    const req = ctx.call.request;
    ctx.body = await provider.decodeTransaction(req);
  },
};
