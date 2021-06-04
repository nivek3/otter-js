import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { bitcoinStateProvider as provider } from '../../providers/chain-state/bitcoin/bitcoin';
import { ImplContext, ProxyImp } from '../utils/context';

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
  DeployAccount: async function (ctx: ImplContext<DeployAccountRequest, DeployAccountReply>) {
    const req = ctx.call.request;
    const address = provider.deployAccount(req);
    ctx.body = { address };
  },

  BuildTransaction: async function (ctx: ImplContext<BuildTransactionRequest, TransactionReply>): Promise<void> {
    const req = ctx.call.request;
    const data = await provider.buildTransaction(req);
    ctx.body = data;
  },

  SignTransaction: async function (ctx: ImplContext<BuildTransactionRequest, TransactionReply>): Promise<void> {
    const req = ctx.call.request;
    const data = await provider.signTransaction(req);
    ctx.body = data;
  },
};
