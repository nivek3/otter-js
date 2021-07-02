import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { bitcoinStateProvider as provider } from '../../providers/chain-state/bitcoin/bitcoin';
import { ImplContext, ProxyImp, signContext } from '../utils/context';
import { GRpcError } from '../internals/error';
import errors from '../errors';

import root from '../../__proto__/compiled';
import { ProtoGrpcType } from '../../__proto__/bitcoin';
import { TransactionReply, SendTransactionReply } from '../../__proto__/common/types';
import {
  BitcoinHandlers,
  DeployAccountRequest,
  DeployAccountReply,
  DeployMultisigAccountRequest,
  DeployMultisigAccountReply,
  BuildTransactionRequest,
  SignTransactionRequest,
  SendTransactionRequest,
  HashForSignatureReply,
  HashForSignatureRequest,
} from '../../__proto__/bitcoin/types';

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
    signContext(root.bitcoin.DeployAccountRequest as unknown as protobuf.Message, ctx);
  },

  DeployMultisigAccount: function (ctx: ImplContext<DeployMultisigAccountRequest, DeployMultisigAccountReply>) {
    const req = ctx.call.request;
    if (!req.threshold || req.threshold < 1) {
      throw new GRpcError({
        ...errors.INVALID_ARGUMENT,
        code: grpc.status.INVALID_ARGUMENT,
        details: 'INVALID ARGUMENT',
        ctx,
      });
    }
    const address = provider.deployMultisigAccount(req);
    ctx.body = { address };
    signContext(root.bitcoin.DeployMultisigAccountReply as unknown as protobuf.Message, ctx);
  },

  BuildTransaction: async function (ctx: ImplContext<BuildTransactionRequest, TransactionReply>): Promise<void> {
    const req = ctx.call.request;
    ctx.body = await provider.buildTransaction(req);
    signContext(root.common.TransactionReply as unknown as protobuf.Message, ctx);
  },

  HashForSignature: function (ctx: ImplContext<HashForSignatureRequest, HashForSignatureReply>): void {
    const req = ctx.call.request;
    ctx.body = provider.hashForSignature(req);
    signContext(root.bitcoin.HashForSignatureReply as unknown as protobuf.Message, ctx);
  },

  SignTransaction: function (ctx: ImplContext<SignTransactionRequest, TransactionReply>): void {
    const req = ctx.call.request;
    ctx.body = provider.signTransaction(req);
    signContext(root.common.TransactionReply as unknown as protobuf.Message, ctx);
  },

  SendTransaction: async function (ctx: ImplContext<SendTransactionRequest, SendTransactionReply>): Promise<void> {
    const req = ctx.call.request;
    ctx.body = await provider.sendTransaction(req);
    signContext(root.common.SendTransactionReply as unknown as protobuf.Message, ctx);
  },
};
