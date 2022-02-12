import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

import { provider } from '@src/providers/chain-state/avalanche/avax';
import { ImplContext, ProxyImp } from '@src/utils/context';

import { ProtoGrpcType } from '@src/__proto__/avalanche';
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
} from '../../../__proto__/avalanche/avax/types';

const filename = path.join(__dirname, '../../../../proto/avalanche/avalanche.proto');
const options = {
  longs: String,
  defaults: false,
  oneofs: true,
};
const packageDefinition = protoLoader.loadSync(filename, options);
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as unknown as ProtoGrpcType;

export const AvalancheAVAXService = protoDescriptor.avalanche.avax.Avalanche.service;

export const AvalancheAVAXImp: ProxyImp<AvalancheHandlers> = {
  DeployAccount: function (ctx: ImplContext<DeployAccountRequest, DeployAccountReply>) {
    const req = ctx.call.request;
    const address = provider.deployAccount(req);
    ctx.body = { address };
  },

  BuildAVAXTransferTransaction: async function (ctx: ImplContext<BuildAVAXTransferTransactionRequest, TransactionReply>): Promise<void> {
    const req = ctx.call.request;
    ctx.body = await provider.buildAVAXTransferTransaction(req);
  },

  SignTransaction: async function (ctx: ImplContext<SignTransactionRequest, TransactionReply>): Promise<void> {
    const req = ctx.call.request;
    ctx.body = await provider.signTransaction(req);
  },

  SendTransaction: async function (ctx: ImplContext<SendTransactionRequest, TransactionReply>): Promise<void> {
    const req = ctx.call.request;
    ctx.body = await provider.sendTransaction(req);
  },

  DecodeTransaction: async function (ctx: ImplContext<DecodeTransactionRequest, TransactionParams>): Promise<void> {
    const req = ctx.call.request;
    ctx.body = await provider.decodeTransaction(req);
  },
};
