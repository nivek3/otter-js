import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { ImplementationContext, ProxyUntypedServiceImplementation } from '@src/utils/context';

import { provider } from '@src/providers/chain-state/ripple/ripple';
import { ProtoGrpcType } from '@src/__proto__/ripple';
import { TransactionReply } from '@src/__proto__/common/types';
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
} from '@src/__proto__/ripple/types';

const filename = path.join(__dirname, '../../../proto/ripple.proto');
const options = {
  longs: String,
  defaults: false,
  oneofs: true,
};
const packageDefinition = protoLoader.loadSync(filename, options);
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as unknown as ProtoGrpcType;

export const RippleService = protoDescriptor.ripple.Ripple.service;

export const RippleImplementation: ProxyUntypedServiceImplementation<RippleHandlers> = {
  DeployAccount: async function (ctx: ImplementationContext<DeployAccountRequest, DeployAccountReply>) {
    const req = ctx.call.request;
    const address = await provider.deployAccount(req);
    ctx.body = { address };
  },

  BuildSignerListSetTransaction: async function (ctx: ImplementationContext<BuildSignerListSetTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildSignerListSetTransaction(req);
  },

  BuildAccountSetTransaction: async function (ctx: ImplementationContext<BuildAccountSetTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildAccountSetTransaction(req);
  },

  BuildPaymentTransaction: async function (ctx: ImplementationContext<BuildPaymentTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildPaymentTransaction(req);
  },

  HashForSignature: async function (ctx: ImplementationContext<HashForSignatureRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.hashForSignature(req);
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
    ctx.body = provider.decodeTransaction(req);
  },

  RebuildTransaction: async function (ctx: ImplementationContext<RebuildTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.rebuildTransaction(req);
  },
};
