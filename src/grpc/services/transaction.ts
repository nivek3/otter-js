import path from 'path';
import * as grpc from 'grpc';
import * as protoLoader from '@grpc/proto-loader';
import { ChainStateProvider } from '../providers/chain-state';

import { ProtoGrpcType } from '../__proto__/transaction';
import { BuildTransactionRequest, BuildTransactionResponse, SignTransactionRequest, SignTransactionResponse  } from '../__proto__/transaction/index';
import { GRpcResponseCode } from '../__proto__/common/index';

const filename = path.join(__dirname, '../../proto/transaction.proto');
const packageDefinition = protoLoader.loadSync(filename, { defaults: true });
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as unknown as ProtoGrpcType;

export const transactionService = protoDescriptor.transaction.Transaction.service;

export const transactionImplementation  = {
  BuildTransaction: async function (
    call: grpc.ServerUnaryCall<BuildTransactionRequest>,
    callback: grpc.sendUnaryData<BuildTransactionResponse>,
  ): Promise<void> {
    const req = call.request;
    try {
      const data = await ChainStateProvider.buildTransaction({
        payload: req.payload,
        network: req.network,
      });
      callback(null, data);
    } catch (err) {
      callback(err, {
        code: GRpcResponseCode.UNKNOWN_ERROR,
      });
    }
  },


  SignTransaction: async function (
    call: grpc.ServerUnaryCall<SignTransactionRequest>,
    callback: grpc.sendUnaryData<SignTransactionResponse>,
  ): Promise<void> {
    const req = call.request;
    console.log(JSON.stringify(req, null, 2));
    try {
      const data = await ChainStateProvider.signTransaction({
        payload: req.payload,
        network: req.network,
      });
      callback(null, data);
    } catch (err) {
      callback(err, {
        code: GRpcResponseCode.UNKNOWN_ERROR,
      });
    }
  },

};
