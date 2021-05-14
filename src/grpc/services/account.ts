import path from 'path';
import * as grpc from 'grpc';
import * as protoLoader from '@grpc/proto-loader';
import { ChainStateProvider } from '../../providers/chain-state';

import { ProtoGrpcType } from '../../__proto__/account';
import { DeployAccountRequest, DeployAccountResponseData } from '../../__proto__/account/index';
import { ImplContext } from '../utils/context';


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
    ctx: ImplContext<DeployAccountRequest, DeployAccountResponseData>
  ): Promise<void> {
    const req = ctx.call.request;
    const address = await ChainStateProvider.deployAccount({
      payload: req.payload,
      network: req.network,
    });
    ctx.body = {
      address
    } 
  },
};