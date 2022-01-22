import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

import { provider } from '@src/providers/chain-state/bitcoin/bitcoin';
import { ImplContext, ProxyImp } from '@src/utils/context';
import { AppError, errors } from '@src/error';

import { ProtoGrpcType } from '@src/__proto__/bitcoin';
import { TransactionReply } from '@src/__proto__/common/types';
import {
  BitcoinHandlers,
  DeployAccountRequest,
  DeployAccountReply,
  DeployMultisigAccountRequest,
  DeployMultisigAccountReply,
  BuildTransactionRequest,
  SignTransactionRequest,
  SendTransactionRequest,
  HashForSignatureRequest,
} from '@src/__proto__/bitcoin/types';

const filename = path.join(__dirname, '../../../proto/bitcoin.proto');
const options = {
  longs: String,
  defaults: false,
  oneofs: true,
};
const packageDefinition = protoLoader.loadSync(filename, options);
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as unknown as ProtoGrpcType;

export const BitcoinService = protoDescriptor.bitcoin.Bitcoin.service;

export const BitcoinImp: ProxyImp<BitcoinHandlers> = {
  DeployAccount: function (ctx: ImplContext<DeployAccountRequest, DeployAccountReply>) {
    const req = ctx.call.request;
    const address = provider.deployAccount(req);
    ctx.body = { address };
  },

  DeployMultisigAccount: function (ctx: ImplContext<DeployMultisigAccountRequest, DeployMultisigAccountReply>) {
    const req = ctx.call.request;
    if (!req.threshold || req.threshold < 1) {
      throw new AppError(errors.INVALID_ARGUMENT);
    }
    const address = provider.deployMultisigAccount(req);
    ctx.body = { address };
  },

  BuildTransaction: async function (ctx: ImplContext<BuildTransactionRequest, TransactionReply>): Promise<void> {
    const req = ctx.call.request;
    ctx.body = await provider.buildTransaction(req);
  },

  HashForSignature: function (ctx: ImplContext<HashForSignatureRequest, TransactionReply>): void {
    const req = ctx.call.request;
    ctx.body = provider.hashForSignature(req);
  },

  SignTransaction: function (ctx: ImplContext<SignTransactionRequest, TransactionReply>): void {
    const req = ctx.call.request;
    ctx.body = provider.signTransaction(req);
  },

  SendTransaction: async function (ctx: ImplContext<SendTransactionRequest, TransactionReply>): Promise<void> {
    const req = ctx.call.request;
    ctx.body = await provider.sendTransaction(req);
  },
};
