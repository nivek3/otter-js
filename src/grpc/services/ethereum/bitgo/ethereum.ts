import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { provider } from '@src/providers/chain-state/ethereum/bitgo/ethereum';
import { ImplContext, ProxyImp } from '@src/utils/context';

import { ProtoGrpcType } from '@src/__proto__/ethereum.bitgo';
import { TransactionReply } from '@src/__proto__/common/types';
import {
  EthereumHandlers,
  BuildAccountTransactionRequest,
  BuildAccountTransactionReply,
  BuildMultisigTransferInputRequest,
  BuildMultisigTransferInputReply,
  SignMultisigTransferInputRequest,
  SignMultisigTransferInputReply,
  BuildMultisigTransferTransactionRequest,
  BuildMultisigERC20TransferInputRequest,
  SignMultisigERC20TransferInputRequest,
} from '@src/__proto__/ethereum/bitgo/types';

const filename = path.join(__dirname, '../../../../../proto/ethereum/ethereum.bitgo.proto');
const options = {
  longs: String,
  defaults: false,
  oneofs: true,
};
const packageDefinition = protoLoader.loadSync(filename, options);
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as unknown as ProtoGrpcType;

export const EthereumBitgoService = protoDescriptor.ethereum.bitgo.Ethereum.service;

export const EthereumBitgoImp: ProxyImp<EthereumHandlers> = {
  BuildAccountTransaction: async function (ctx: ImplContext<BuildAccountTransactionRequest, BuildAccountTransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildAccountTransaction(req);
  },

  BuildMultisigTransferInput: async function (ctx: ImplContext<BuildMultisigTransferInputRequest, BuildMultisigTransferInputReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildMultisigTransferInput(req);
  },

  SignMultisigTransferInput: async function (ctx: ImplContext<SignMultisigTransferInputRequest, SignMultisigTransferInputReply>) {
    const req = ctx.call.request;
    ctx.body = provider.signMultisigTransferInput(req);
  },

  BuildMultisigTransferTransaction: async function (ctx: ImplContext<BuildMultisigTransferTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildMultisigTransferTransaction(req);
  },

  BuildMultisigERC20TransferInput: async function (ctx: ImplContext<BuildMultisigERC20TransferInputRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildMultisigERC20TransferInput(req);
  },

  SignMultisigERC20TransferInput: async function (ctx: ImplContext<SignMultisigERC20TransferInputRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = provider.signMultisigERC20TransferInput(req);
  },
};
