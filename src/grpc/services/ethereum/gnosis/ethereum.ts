import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { provider } from '@src/providers/chain-state/ethereum/gnosis/ethereum';
import { ImplContext, ProxyImp } from '@src/utils/context';

import { ProtoGrpcType } from '@src/__proto__/ethereum.gnosis';
import { TransactionReply } from '@src/__proto__/common/types';
import {
  EthereumHandlers,
  BuildAccountTransactionRequest,
  BuildAccountTransactionReply,
  BuildMultisigTransferInputRequest,
  SignMultisigTransferInputRequest,
  BuildMultisigTransactionRequest,
  BuildMultisigERC20TransferInputRequest,
  SignMultisigERC20TransferInputRequest,
  GetAccountAddressRequest,
  GetAccountAddressReply,
  BuildMultisigInputRequest,
} from '@src/__proto__/ethereum/gnosis/types';

const filename = path.join(__dirname, '../../../../../proto/ethereum/ethereum.gnosis.proto');
const options = {
  longs: String,
  defaults: false,
  oneofs: true,
};
const packageDefinition = protoLoader.loadSync(filename, options);
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as unknown as ProtoGrpcType;

export const EthereumGnosisService = protoDescriptor.ethereum.gnosis.Ethereum.service;

export const EthereumGnosisImp: ProxyImp<EthereumHandlers> = {
  GetAccountAddress: async function (ctx: ImplContext<GetAccountAddressRequest, GetAccountAddressReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.getAccountAddress(req);
  },

  BuildAccountTransaction: async function (ctx: ImplContext<BuildAccountTransactionRequest, BuildAccountTransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildAccountTransaction(req);
  },

  BuildMultisigInput: async function (ctx: ImplContext<BuildMultisigInputRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildMultisigInput(req);
  },

  SignMultisigInput: async function (ctx: ImplContext<SignMultisigTransferInputRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = provider.signMultisigTransferInput(req);
  },

  BuildMultisigTransferInput: async function (ctx: ImplContext<BuildMultisigTransferInputRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildMultisigTransferInput(req);
  },

  SignMultisigTransferInput: async function (ctx: ImplContext<SignMultisigTransferInputRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = provider.signMultisigTransferInput(req);
  },

  BuildMultisigTransaction: async function (ctx: ImplContext<BuildMultisigTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildMultisigTransaction(req);
  },

  BuildMultisigERC20TransferInput: async function (ctx: ImplContext<BuildMultisigERC20TransferInputRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildMultisigERC20TransferInput(req);
  },

  SignMultisigERC20TransferInput: async function (ctx: ImplContext<SignMultisigERC20TransferInputRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.signMultisigERC20TransferInput(req);
  },
};
