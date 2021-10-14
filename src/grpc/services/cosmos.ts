import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { provider } from '../../providers/chain-state/cosmos';
import { ImplContext, ProxyImp } from '../../utils/context';

import { ProtoGrpcType } from '../../__proto__/cosmos';
import {
  DeployAccountRequest,
  DeployAccountReply,
  CosmosHandlers,
  BuildTransferTransactionRequest,
  SignTransactionRequest,
  SendTransactionRequest,
  DecodeTransactionRequest,
  TransactionParams,
  RebuildTransactionRequest,
} from '../../__proto__/cosmos/types';
import { TransactionReply } from '../../__proto__/common/TransactionReply';

const filename = path.join(__dirname, '../../../proto/cosmos.proto');
const options = {
  longs: String,
  defaults: false,
  oneofs: true,
};
const packageDefinition = protoLoader.loadSync(filename, options);
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as unknown as ProtoGrpcType;

export const CosmosService = protoDescriptor.cosmos.Cosmos.service;

export const CosmosImp: ProxyImp<CosmosHandlers> = {
  DeployAccount: function (ctx: ImplContext<DeployAccountRequest, DeployAccountReply>) {
    const req = ctx.call.request;
    ctx.body = provider.deployAccount(req);
  },

  BuildTransferTransaction: async function (ctx: ImplContext<BuildTransferTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildTransferTransaction(req);
  },

  SignTransaction: async function (ctx: ImplContext<SignTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.signTransaction(req);
  },

  SendTransaction: async function (ctx: ImplContext<SendTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.sendTransaction(req);
  },

  DecodeTransaction: async function (ctx: ImplContext<DecodeTransactionRequest, TransactionParams>) {
    const req = ctx.call.request;
    ctx.body = await provider.decodeTransaction(req);
  },

  RebuildTransaction: async function (ctx: ImplContext<RebuildTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.rebuildTransaction(req);
  },
};
