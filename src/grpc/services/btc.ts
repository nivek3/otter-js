import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { bitcoinStateProvider as provider } from '../../providers/chain-state/bitcoin/bitcoin';
import { ImplContext } from '../utils/context';

import { ProtoGrpcType } from '../../__proto__/btc';
import { TransactionReply } from '../../__proto__/common/index';
import { BTCDefinition, DeployAccountRequest, DeployAccountReply, BuildTransactionRequest } from '../../__proto__/btc/index';

const filename = path.join(__dirname, '../../../proto/btc.proto');
const options = {
  longs: String,
  defaults: false,
  oneofs: true,
};
const packageDefinition = protoLoader.loadSync(filename, options);
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as unknown as ProtoGrpcType;

export const btcService = protoDescriptor.btc.BTC.service;

export const btcImp: Record<keyof BTCDefinition, any> = {
  DeployAccount: async function (ctx: ImplContext<DeployAccountRequest, DeployAccountReply>) {
    const req = ctx.call.request;
    const address = provider.deployAccount(req);
    ctx.body = { address };
  },

  // BuildTransaction: async function (ctx: ImplContext<BuildTransactionRequest, TransactionReply>): Promise<void> {
  //   const req = ctx.call.request;
  //   const data = await provider.buildTransaction(req);
  //   ctx.body = data;
  // },
};
