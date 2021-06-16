import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { polkaDotStateProvider as provider } from '../../providers/chain-state/polkadot';
import { ImplContext, ProxyImp } from '../utils/context';

import root from '../../__proto__/compiled';
import { ProtoGrpcType } from '../../__proto__/polkadot';
import { TransactionReply, SendTransactionReply } from '../../__proto__/common/index';
import {
  PolkadotHandlers,
  DeployAccountRequest,
  DeployAccountReply,
  TransferRequest,
  MultisigTransferRequest,
  MultisigApproveRequest,
  MultisigCancelRequest,
  SendTransactionRequest,
} from '../../__proto__/polkadot/index';

const filename = path.join(__dirname, '../../../proto/polkadot.proto');
const options = {
  longs: String,
  defaults: false,
  oneofs: true,
};
const packageDefinition = protoLoader.loadSync(filename, options);
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as unknown as ProtoGrpcType;

export const PolkadotService = protoDescriptor.polkadot.Polkadot.service;

export const PolkadotImp: ProxyImp<PolkadotHandlers> = {
  DeployAccount: function (ctx: ImplContext<DeployAccountRequest, DeployAccountReply>) {
    const req = ctx.call.request;
    const address = provider.deployAccount(req);
    ctx.body = { address };
    const signature = ctx.signature(root.polkadot.DeployAccountReply as unknown as protobuf.Message, ctx.body);
    ctx.call.metadata.set('signature', signature);
  },

  DeployMultiAccount: function (ctx: ImplContext<DeployAccountRequest, DeployAccountReply>) {
    const req = ctx.call.request;
    const address = provider.deployMultiAccount(req);
    ctx.body = { address };
    const signature = ctx.signature(root.polkadot.DeployMultiAccountReply as unknown as protobuf.Message, ctx.body);
    ctx.call.metadata.set('signature', signature);
  },

  BuildTransferTransaction: async function (ctx: ImplContext<TransferRequest, TransactionReply>): Promise<void> {
    const req = ctx.call.request;
    const data = await provider.buildTransferTransaction(req);
    ctx.body = data;
    const signature = ctx.signature(root.common.TransactionReply as unknown as protobuf.Message, ctx.body);
    ctx.call.metadata.set('signature', signature);
  },

  BuildMultisigTransaction: async function (ctx: ImplContext<MultisigTransferRequest, TransactionReply>): Promise<void> {
    const req = ctx.call.request;
    const data = await provider.buildMultisigTransaction(req);
    ctx.body = data;
    const signature = ctx.signature(root.common.TransactionReply as unknown as protobuf.Message, ctx.body);
    ctx.call.metadata.set('signature', signature);
  },

  MultisigApproveTransaction: async function (ctx: ImplContext<MultisigApproveRequest, TransactionReply>): Promise<void> {
    const req = ctx.call.request;
    const data = await provider.multisigApproveTransaction(req);
    ctx.body = data;
    const signature = ctx.signature(root.common.TransactionReply as unknown as protobuf.Message, ctx.body);
    ctx.call.metadata.set('signature', signature);
  },

  MultisigCancelTransaction: async function (ctx: ImplContext<MultisigCancelRequest, TransactionReply>): Promise<void> {
    const req = ctx.call.request;
    const data = await provider.multisigCancelTransaction(req);
    ctx.body = data;
    const signature = ctx.signature(root.common.TransactionReply as unknown as protobuf.Message, ctx.body);
    ctx.call.metadata.set('signature', signature);
  },

  SignTransaction: async function (ctx: ImplContext<TransferRequest, TransactionReply>): Promise<void> {
    const req = ctx.call.request;
    const data = await provider.signTransaction(req);
    ctx.body = data;
    const signature = ctx.signature(root.common.TransactionReply as unknown as protobuf.Message, ctx.body);
    ctx.call.metadata.set('signature', signature);
  },

  SendTransaction: async function (ctx: ImplContext<SendTransactionRequest, SendTransactionReply>): Promise<void> {
    const req = ctx.call.request;
    const data = await provider.sendTransaction(req);
    ctx.body = data;
    const signature = ctx.signature(root.common.SendTransactionReply as unknown as protobuf.Message, ctx.body);
    ctx.call.metadata.set('signature', signature);
  },
};
