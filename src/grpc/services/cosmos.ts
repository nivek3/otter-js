import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { provider } from '@src/providers/chain-state/cosmos';
import { ImplContext, ProxyImp } from '@src/utils/context';

import { ProtoGrpcType } from '@src/__proto__/cosmos';
import {
  DeployAccountRequest,
  DeployMultisigAccountRequest,
  DeployAccountReply,
  CosmosHandlers,
  BuildTransferTransactionRequest,
  BuildMultisigTransferTransactionRequest,
  SignTransactionRequest,
  SendTransactionRequest,
  DecodeTransactionRequest,
  TransactionParams,
  RebuildTransactionRequest,
  SignMultisigTransactionRequest,
} from '@src/__proto__/cosmos/types';
import { TransactionReply } from '@src/__proto__/common/TransactionReply';

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

  DeployMultisigAccount: function (ctx: ImplContext<DeployMultisigAccountRequest, DeployAccountReply>) {
    const req = ctx.call.request;
    ctx.body = provider.deployMultisigAccount(req);
  },

  BuildMultisigTransferTransaction: async function (ctx: ImplContext<BuildMultisigTransferTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildMultisigTransferTransaction(req);
  },

  SignMultisigTransaction: async function (ctx: ImplContext<SignMultisigTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.signMultisigTransaction(req);
  },
};
