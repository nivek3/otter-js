import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { provider } from '../../providers/chain-state/tron/tron';
import { ImplContext, ProxyImp } from '../../utils/context';

import { ProtoGrpcType } from '../../__proto__/tron';
import { TransactionReply } from './../../__proto__/polkadot/TransactionReply';
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
} from '../../__proto__/tron/types';

const filename = path.join(__dirname, '../../../proto/tron.proto');
const options = {
  longs: String,
  defaults: false,
  oneofs: true,
};
const packageDefinition = protoLoader.loadSync(filename, options);
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as unknown as ProtoGrpcType;

export const TronService = protoDescriptor.tron.Tron.service;

export const TronImp: ProxyImp<TronHandlers> = {
  DeployAccount: function (ctx: ImplContext<DeployAccountRequest, DeployAccountReply>) {
    const req = ctx.call.request;
    const address = provider.deployAccount(req);
    ctx.body = { address };
  },

  BuildTransferTransaction: async function (ctx: ImplContext<BuildTransferTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildTransferTransaction(req);
  },

  BuildTRC10TransferTransaction: async function (ctx: ImplContext<BuildTRC10TransferTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildTRC10TransferTransaction(req);
  },

  BuildTRC20TransferTransaction: async function (ctx: ImplContext<BuildTRC20TransferTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildTRC20TransferTransaction(req);
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
