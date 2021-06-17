import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { provider } from '../../providers/chain-state/ethereum/ethereum';
import { ImplContext, ProxyImp, signContext } from '../utils/context';

import root from '../../__proto__/compiled';
import { ProtoGrpcType } from '../../__proto__/ethereum';
import { TransactionReply } from '../../__proto__/common/types';
import {
  DeployAccountRequest,
  DeployAccountReply,
  EthereumHandlers,
  BuildAccountRequest,
  BuildAccountReply,
  SignTransactionRequest,
} from '../../__proto__/ethereum/types';

const filename = path.join(__dirname, '../../../proto/ethereum.proto');
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
    signContext(root.ethereum.DeployAccountRequest as unknown as protobuf.Message, ctx);
  },

  BuildAccount: async function (ctx: ImplContext<BuildAccountRequest, BuildAccountReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildAccount(req);
    signContext(root.ethereum.DeployAccountRequest as unknown as protobuf.Message, ctx);
  },

  SignTransaction: async function (ctx: ImplContext<SignTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = provider.signTransaction(req);
    signContext(root.ethereum.SignTransactionRequest as unknown as protobuf.Message, ctx);
  },
};
