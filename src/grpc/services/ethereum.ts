import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { provider } from '../../providers/chain-state/ethereum/ethereum';
import { ImplContext, ProxyImp } from '../utils/context';
import { GRpcError } from '../internals/error';
import errors from '../errors';

import root from '../../__proto__/compiled';
import { ProtoGrpcType } from '../../__proto__/ethereum';
import { DeployAccountRequest, DeployAccountReply, EthereumHandlers } from '../../__proto__/ethereum/index';

const filename = path.join(__dirname, '../../../proto/bitcoin.proto');
const options = {
  longs: String,
  defaults: false,
  oneofs: true,
};
const packageDefinition = protoLoader.loadSync(filename, options);
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as unknown as ProtoGrpcType;

export const EthereumService = protoDescriptor.ethereum.Ethereum.service;

export const EthereumImp: ProxyImp<EthereumHandlers> = {
  DeployAccount: function (ctx: ImplContext<DeployAccountRequest, DeployAccountReply>) {
    const req = ctx.call.request;
    const address = provider.deployAccount(req);
    ctx.body = { address };
    const signature = ctx.signature(root.bitcoin.DeployAccountRequest as unknown as protobuf.Message, ctx.body);
    ctx.call.metadata.set('signature', signature);
  },
};
