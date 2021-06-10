import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { bitcoinStateProvider as provider } from '../../providers/chain-state/bitcoin/bitcoin';
import { ImplContext, ProxyImp } from '../utils/context';
import { GRpcError } from '../internals/error';
import errors from '../errors';

import root from '../../__proto__/compiled';
import { ProtoGrpcType } from '../../__proto__/bitcoin';
import { TransactionReply } from '../../__proto__/common/index';
import {
  BitCoinDefinition,
  DeployAccountRequest,
  DeployAccountReply,
  BuildTransactionRequest,
  SignTransactionRequest,
} from '../../__proto__/bitcoin/index';

const filename = path.join(__dirname, '../../../proto/bitcoin.proto');
const options = {
  longs: String,
  defaults: false,
  oneofs: true,
};
const packageDefinition = protoLoader.loadSync(filename, options);
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as unknown as ProtoGrpcType;

export const BitCoinService = protoDescriptor.bitcoin.BitCoin.service;

export const BitCoinImp: ProxyImp<BitCoinDefinition> = {
  DeployAccount: function (ctx: ImplContext<DeployAccountRequest, DeployAccountReply>) {
    const req = ctx.call.request;
    if (!req.threshold || req.threshold < 1) {
      throw new GRpcError({
        ...errors.INVALID_ARGUMENT,
        code: grpc.status.INVALID_ARGUMENT,
        details: 'INVALID ARGUMENT',
        ctx,
      });
    }
    const address = provider.deployAccount(req);
    ctx.body = { address };
    const signature = ctx.signature(root.bitcoin.DeployAccountRequest as unknown as protobuf.Message, ctx.body);
    ctx.call.metadata.set('signature', signature);
  },

  BuildTransaction: function (ctx: ImplContext<BuildTransactionRequest, TransactionReply>): void {
    const req = ctx.call.request;
    const data = provider.buildTransaction(req);
    ctx.body = data;
    const signature = ctx.signature(root.common.TransactionReply as unknown as protobuf.Message, ctx.body);
    ctx.call.metadata.set('signature', signature);
  },

  SignTransaction: function (ctx: ImplContext<SignTransactionRequest, TransactionReply>): void {
    const req = ctx.call.request;
    const data = provider.signTransaction(req);
    ctx.body = data;
    const signature = ctx.signature(root.common.TransactionReply as unknown as protobuf.Message, ctx.body);
    ctx.call.metadata.set('signature', signature);
  },
};
