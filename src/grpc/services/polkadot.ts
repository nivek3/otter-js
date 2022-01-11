import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { provider } from '../../providers/chain-state/polkadot';
import { ImplContext, ProxyImp } from '../../utils/context';

import { ProtoGrpcType } from '../../__proto__/polkadot';
import { TransactionReply } from '../../__proto__/common/types';
import {
  TransactionParams,
  PolkadotHandlers,
  DeployAccountRequest,
  DeployAccountReply,
  BuildTransferRequest,
  BuildMultisigApproveAsMultiRequest,
  BuildMultisigAsMultiRequest,
  BuildMultisigCancelAsMultiRequest,
  SendTransactionRequest,
  BuildBatchTransferTransactionRequest,
  BuildBatchTransactionRequest,
  RebuildTransactionRequest,
  DecodeTransactionRequest,
} from '../../__proto__/polkadot/types';

const filename = path.join(__dirname, '../../../proto/polkadot.proto');
const options = {
  longs: String,
  defaults: false,
  oneofs: true,
};
const packageDefinition = protoLoader.loadSync(filename, options);
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as unknown as ProtoGrpcType;

export const PolkadotService = protoDescriptor.polkadot.Polkadot.service;

export const PolkadotImp: ProxyImp<PolkadotHandlers> = {
  DeployAccount: function (ctx: ImplContext<DeployAccountRequest, DeployAccountReply>) {
    const req = ctx.call.request;
    const address = provider.deployAccount(req);
    ctx.body = { address };
  },

  DeployMultisigAccount: function (ctx: ImplContext<DeployAccountRequest, DeployAccountReply>) {
    const req = ctx.call.request;
    const address = provider.deployMultisigAccount(req);
    ctx.body = { address };
  },

  BuildTransferTransaction: async function (ctx: ImplContext<BuildTransferRequest, TransactionReply>): Promise<void> {
    const req = ctx.call.request;
    ctx.body = await provider.buildTransferTransaction(req);
  },

  BuildMultisigApproveAsMultiTransaction: async function (
    ctx: ImplContext<BuildMultisigApproveAsMultiRequest, TransactionReply>,
  ): Promise<void> {
    const req = ctx.call.request;
    ctx.body = await provider.buildMultisigApproveAsMultiTransaction(req);
  },

  BuildMultisigAsMultiTransaction: async function (ctx: ImplContext<BuildMultisigAsMultiRequest, TransactionReply>): Promise<void> {
    const req = ctx.call.request;
    ctx.body = await provider.buildMultisigAsMultiTransaction(req);
  },

  BuildMultisigCancelAsMultiTransaction: async function (
    ctx: ImplContext<BuildMultisigCancelAsMultiRequest, TransactionReply>,
  ): Promise<void> {
    const req = ctx.call.request;
    ctx.body = await provider.buildMultisigCancelAsMultiTransaction(req);
  },

  SignTransaction: async function (ctx: ImplContext<BuildTransferRequest, TransactionReply>): Promise<void> {
    const req = ctx.call.request;
    ctx.body = await provider.signTransaction(req);
  },

  SendTransaction: async function (ctx: ImplContext<SendTransactionRequest, TransactionReply>): Promise<void> {
    const req = ctx.call.request;
    ctx.body = await provider.sendTransaction(req);
  },

  BuildBatchTransferTransaction: async function (ctx: ImplContext<BuildBatchTransferTransactionRequest, TransactionReply>): Promise<void> {
    const req = ctx.call.request;
    ctx.body = await provider.buildBatchTransferTransaction(req);
  },

  BuildBatchTransaction: async function (ctx: ImplContext<BuildBatchTransactionRequest, TransactionReply>): Promise<void> {
    const req = ctx.call.request;
    ctx.body = await provider.buildBatchTransaction(req);
  },

  RebuildTransaction: async function (ctx: ImplContext<RebuildTransactionRequest, TransactionReply>): Promise<void> {
    const req = ctx.call.request;
    ctx.body = await provider.rebuildTransaction(req);
  },

  DecodeTransaction: async function (ctx: ImplContext<DecodeTransactionRequest, TransactionParams>): Promise<void> {
    const req = ctx.call.request;
    ctx.body = await provider.decodeTransaction(req);
  },
};
