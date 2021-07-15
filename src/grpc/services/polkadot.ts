import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { provider } from '../../providers/chain-state/polkadot';
import { ImplContext, ProxyImp } from '../utils/context';

import { ProtoGrpcType } from '../../__proto__/polkadot';
import { TransactionReply, SendTransactionReply } from '../../__proto__/common/types';
import {
  PolkadotHandlers,
  DeployAccountRequest,
  DeployAccountReply,
  TransferRequest,
  MultisigTransferRequest,
  MultisigApproveRequest,
  MultisigCancelRequest,
  SendTransactionRequest,
  BatchTransferTransactionRequest,
  BatchTransactionRequest,
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

  BuildTransferTransaction: async function (ctx: ImplContext<TransferRequest, TransactionReply>): Promise<void> {
    const req = ctx.call.request;
    ctx.body = await provider.buildTransferTransaction(req);
  },

  BuildMultisigTransaction: async function (ctx: ImplContext<MultisigTransferRequest, TransactionReply>): Promise<void> {
    const req = ctx.call.request;
    ctx.body = await provider.buildMultisigTransaction(req);
  },

  MultisigApproveTransaction: async function (ctx: ImplContext<MultisigApproveRequest, TransactionReply>): Promise<void> {
    const req = ctx.call.request;
    ctx.body = await provider.multisigApproveTransaction(req);
  },

  MultisigCancelTransaction: async function (ctx: ImplContext<MultisigCancelRequest, TransactionReply>): Promise<void> {
    const req = ctx.call.request;
    ctx.body = await provider.multisigCancelTransaction(req);
  },

  SignTransaction: async function (ctx: ImplContext<TransferRequest, TransactionReply>): Promise<void> {
    const req = ctx.call.request;
    ctx.body = await provider.signTransaction(req);
  },

  SendTransaction: async function (ctx: ImplContext<SendTransactionRequest, SendTransactionReply>): Promise<void> {
    const req = ctx.call.request;
    ctx.body = await provider.sendTransaction(req);
  },

  BatchTransferTransaction: async function (ctx: ImplContext<BatchTransferTransactionRequest, TransactionReply>): Promise<void> {
    const req = ctx.call.request;
    ctx.body = await provider.batchTransferTransaction(req);
  },

  BatchTransaction: async function (ctx: ImplContext<BatchTransactionRequest, TransactionReply>): Promise<void> {
    const req = ctx.call.request;
    ctx.body = await provider.batchTransaction(req);
  },
};
