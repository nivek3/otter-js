import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { provider } from '../../providers/chain-state/ethereum/ethereum';
import { ImplContext, ProxyImp } from '../utils/context';

import { ProtoGrpcType } from '../../__proto__/ethereum';
import { TransactionReply, SendTransactionReply } from '../../__proto__/common/types';
import {
  DeployAccountRequest,
  DeployAccountReply,
  EthereumHandlers,
  BuildAccountTransactionRequest,
  BuildAccountTransactionReply,
  BuildTransferTransactionRequest,
  BuildTokenTransferTransactionRequest,
  SignTransactionRequest,
  RebuildTransactionRequest,
  SendTransactionRequest,
  BuildMultisigTransferInputRequest,
  BuildMultisigTransferInputReply,
  SignMultisigTransferInputRequest,
  SignMultisigTransferInputReply,
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
  },

  BuildAccountTransaction: async function (ctx: ImplContext<BuildAccountTransactionRequest, BuildAccountTransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildAccountTransaction(req);
  },

  BuildTransferTransaction: async function (ctx: ImplContext<BuildTransferTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildTransferTransaction(req);
  },

  BuildTokenTransferTransaction: async function (ctx: ImplContext<BuildTokenTransferTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildTokenTransferTransaction(req);
  },

  SignTransaction: async function (ctx: ImplContext<SignTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = provider.signTransaction(req);
  },

  RebuildTransaction: async function (ctx: ImplContext<RebuildTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.rebuildTransaction(req);
  },

  SendTransaction: async function (ctx: ImplContext<SendTransactionRequest, SendTransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.sendTransaction(req);
  },

  BuildMultisigTransferInput: async function (ctx: ImplContext<BuildMultisigTransferInputRequest, BuildMultisigTransferInputReply>) {
    const req = ctx.call.request;
    ctx.body = provider.buildMultisigTransferInput(req);
  },

  SignMultisigTransferInput: async function (ctx: ImplContext<SignMultisigTransferInputRequest, SignMultisigTransferInputReply>) {
    const req = ctx.call.request;
    ctx.body = provider.signMultisigTransferInput(req);
  },
};
