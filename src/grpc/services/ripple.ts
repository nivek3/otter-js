import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { provider } from '../../providers/chain-state/ripple/ripple';
import { ImplContext, ProxyImp } from '../../utils/context';

import { ProtoGrpcType } from '../../__proto__/ripple';
import { TransactionReply } from '../../__proto__/common/types';
import {
  RippleHandlers,
  TransactionParams,
  DeployAccountRequest,
  DeployAccountReply,
  BuildPaymentTransactionRequest,
  BuildAccountSetTransactionRequest,
  BuildSignerListSetTransactionRequest,
  HashForSignatureRequest,
  SignTransactionRequest,
  SendTransactionRequest,
  DecodeTransactionRequest,
  RebuildTransactionRequest,
} from '../../__proto__/ripple/types';

const filename = path.join(__dirname, '../../../proto/ripple.proto');
const options = {
  longs: String,
  defaults: false,
  oneofs: true,
};
const packageDefinition = protoLoader.loadSync(filename, options);
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as unknown as ProtoGrpcType;

export const RippleService = protoDescriptor.ripple.Ripple.service;

export const RippleImp: ProxyImp<RippleHandlers> = {
  DeployAccount: async function (ctx: ImplContext<DeployAccountRequest, DeployAccountReply>) {
    const req = ctx.call.request;
    const address = await provider.deployAccount(req);
    ctx.body = { address };
  },

  BuildSignerListSetTransaction: async function (ctx: ImplContext<BuildSignerListSetTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildSignerListSetTransaction(req);
  },

  BuildAccountSetTransaction: async function (ctx: ImplContext<BuildAccountSetTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildAccountSetTransaction(req);
  },

  BuildPaymentTransaction: async function (ctx: ImplContext<BuildPaymentTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildPaymentTransaction(req);
  },

  HashForSignature: async function (ctx: ImplContext<HashForSignatureRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.hashForSignature(req);
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
    ctx.body = provider.decodeTransaction(req);
  },

  RebuildTransaction: async function (ctx: ImplContext<RebuildTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.rebuildTransaction(req);
  },
};
