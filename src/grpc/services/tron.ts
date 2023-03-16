import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

import { provider } from '@src/providers/chain-state/tron/tron';
import { ImplementationContext, ProxyUntypedServiceImplementation } from '@src/utils/context';

import { ProtoGrpcType } from '@src/__proto__/tron';
import { TransactionReply } from '@src/__proto__/polkadot/TransactionReply';
import {
  BuildTransferTransactionRequest,
  DeployAccountRequest,
  DeployAccountReply,
  TronHandlers,
  SignTransactionRequest,
  SendTransactionRequest,
  BuildTRC10TransferTransactionRequest,
  BuildTRC20TransferTransactionRequest,
  RebuildTransactionRequest,
  DecodeTransactionRequest,
  TransactionParams,
} from '@src/__proto__/tron/types';

const filename = path.join(__dirname, '../../../proto/tron.proto');
const options = {
  longs: String,
  defaults: false,
  oneofs: true,
};
const packageDefinition = protoLoader.loadSync(filename, options);
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as unknown as ProtoGrpcType;

export const TronService = protoDescriptor.tron.Tron.service;

export const TronImplementation: ProxyUntypedServiceImplementation<TronHandlers> = {
  DeployAccount: function (ctx: ImplementationContext<DeployAccountRequest, DeployAccountReply>) {
    const req = ctx.call.request;
    const address = provider.deployAccount(req);
    ctx.body = { address };
  },

  BuildTransferTransaction: async function (ctx: ImplementationContext<BuildTransferTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildTransferTransaction(req);
  },

  BuildTRC10TransferTransaction: async function (ctx: ImplementationContext<BuildTRC10TransferTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildTRC10TransferTransaction(req);
  },

  BuildTRC20TransferTransaction: async function (ctx: ImplementationContext<BuildTRC20TransferTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildTRC20TransferTransaction(req);
  },

  SignTransaction: async function (ctx: ImplementationContext<SignTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.signTransaction(req);
  },

  SendTransaction: async function (ctx: ImplementationContext<SendTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.sendTransaction(req);
  },

  DecodeTransaction: async function (ctx: ImplementationContext<DecodeTransactionRequest, TransactionParams>) {
    const req = ctx.call.request;
    ctx.body = await provider.decodeTransaction(req);
  },

  RebuildTransaction: async function (ctx: ImplementationContext<RebuildTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.rebuildTransaction(req);
  },
};
