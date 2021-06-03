import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { polkaDotStateProvider as provider } from '../../providers/chain-state/polkadot';
import { ImplContext } from '../utils/context';

import { ProtoGrpcType } from '../../__proto__/polkadot';
import { TransactionReply } from '../../__proto__/common/index';
import { PolkadotDefinition, DeployAccountRequest, DeployAccountReply, MultisigTransferRequest } from '../../__proto__/polkadot/index';

const filename = path.join(__dirname, '../../../proto/polkadot.proto');
const options = {
  longs: String,
  defaults: false,
  oneofs: true,
};
const packageDefinition = protoLoader.loadSync(filename, options);
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as unknown as ProtoGrpcType;

export const polkadotService = protoDescriptor.polkadot.Polkadot.service;

export const polkadotImp: Record<keyof PolkadotDefinition, any> = {
  DeployAccount: async function (ctx: ImplContext<DeployAccountRequest, DeployAccountReply>) {
    const req = ctx.call.request;
    const address = provider.deployAccount(req);
    ctx.body = { address };
  },

  BuildMultisigTransaction: async function (ctx: ImplContext<MultisigTransferRequest, TransactionReply>): Promise<void> {
    const req = ctx.call.request;
    const data = await provider.buildMultisigTransaction(req);
    ctx.body = data;
  },
};
