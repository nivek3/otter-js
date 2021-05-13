import path from 'path';
import * as grpc from 'grpc';
import * as protoLoader from '@grpc/proto-loader';
import { ChainStateProvider } from '../../providers/chain-state';

import { ProtoGrpcType } from '../../__proto__/account';
import { DeployAccountRequest, DeployAccountResponse } from '../../__proto__/account/index';
import { GRpcResponseCode } from '../../__proto__/common/index';

const filename = path.join(__dirname, '../../../proto/account.proto');
const options = {
  longs: String,
  defaults: false,
  oneofs: true,
}
const packageDefinition = protoLoader.loadSync(filename, options);
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as unknown as ProtoGrpcType;

export const accountService = protoDescriptor.account.Account.service;

export const accountImplementation = {
  DeployAccount: async function (
    call: grpc.ServerUnaryCall<DeployAccountRequest>,
    callback: grpc.sendUnaryData<DeployAccountResponse>,
  ): Promise<void> {
    const req = call.request;
    try {
      const account = await ChainStateProvider.deployAccount({
        payload: req.payload,
        network: req.network,
      });
      callback(null, {
        code: GRpcResponseCode.SUCCESS,
        address: account,
      });
    } catch (err) {
      console.error(err);
      callback(err, {
        code: GRpcResponseCode.UNKNOWN_ERROR,
      });
    }
  },
};
