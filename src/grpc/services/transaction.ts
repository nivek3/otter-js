import path from 'path';
import * as grpc from 'grpc';
import * as protoLoader from '@grpc/proto-loader';
import { ChainStateProvider } from '../../providers/chain-state';
import { ImplContext } from '../utils/context';

import { ProtoGrpcType } from '../../__proto__/transaction';
import { BuildTransactionRequest, BuildTransactionResponseData, SignTransactionRequest, SignTransactionResponseData  } from '../../__proto__/transaction/index';

const filename = path.join(__dirname, '../../../proto/transaction.proto');
const options = {
  longs: String,
  defaults: false,
  oneofs: true,
}
const packageDefinition = protoLoader.loadSync(filename, options);
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as unknown as ProtoGrpcType;

export const transactionService = protoDescriptor.transaction.Transaction.service;

export const transactionImplementation  = {
  BuildTransaction: async function (
    ctx: ImplContext<BuildTransactionRequest, BuildTransactionResponseData> 
  ): Promise<void> {
    const req = ctx.call.request;
    const data = await ChainStateProvider.buildTransaction({
      payload: req.payload,
      network: req.network,
    });
    ctx.body = data;
  },

  SignTransaction: async function (
    ctx: ImplContext<SignTransactionRequest, SignTransactionResponseData>,
  ): Promise<void> {
    const req = ctx.call.request;
    const data = await ChainStateProvider.signTransaction({
      payload: req.payload,
      network: req.network,
    });
    ctx.body = data;
  },
};
