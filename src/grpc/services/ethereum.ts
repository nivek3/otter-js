import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { provider } from '../../providers/chain-state/ethereum/ethereum';
import { ImplContext, ProxyImp } from '../../utils/context';

import { ProtoGrpcType } from '../../__proto__/ethereum';
import { TransactionReply } from '../../__proto__/common/types';
import {
  TransactionParams,
  DeployAccountRequest,
  DeployAccountReply,
  EthereumHandlers,
  BuildAccountTransactionRequest,
  BuildAccountTransactionReply,
  BuildTransferTransactionRequest,
  BuildERC20TransferTransactionRequest,
  SignTransactionRequest,
  RebuildTransactionRequest,
  SendTransactionRequest,
  BuildMultisigTransferInputRequest,
  BuildMultisigTransferInputReply,
  SignMultisigTransferInputRequest,
  SignMultisigTransferInputReply,
  BuildMultisigTransferTransactionRequest,
  BuildMultisigERC20TransferInputRequest,
  SignMultisigERC20TransferInputRequest,
  HashForSignatureRequest,
  DecodeTransactionRequest,
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

  BuildERC20TransferTransaction: async function (ctx: ImplContext<BuildERC20TransferTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildERC20TransferTransaction(req);
  },

  // deprecated
  BuildTokenTransferTransaction: async function (ctx: ImplContext<BuildERC20TransferTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildERC20TransferTransaction(req);
  },

  SignTransaction: async function (ctx: ImplContext<SignTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = provider.signTransaction(req);
  },

  RebuildTransaction: async function (ctx: ImplContext<RebuildTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.rebuildTransaction(req);
  },

  SendTransaction: async function (ctx: ImplContext<SendTransactionRequest, TransactionReply>) {
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

  BuildMultisigTransferTransaction: async function (ctx: ImplContext<BuildMultisigTransferTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildMultisigTransferTransaction(req);
  },

  BuildMultisigERC20TransferInput: async function (ctx: ImplContext<BuildMultisigERC20TransferInputRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = provider.buildMultisigERC20TransferInput(req);
  },

  SignMultisigERC20TransferInput: async function (ctx: ImplContext<SignMultisigERC20TransferInputRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = provider.signMultisigERC20TransferInput(req);
  },

  // deprecated
  BuildMultisigTokenTransferInput: async function (ctx: ImplContext<BuildMultisigERC20TransferInputRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = provider.buildMultisigERC20TransferInput(req);
  },

  // deprecated
  SignMultisigTokenTransferInput: async function (ctx: ImplContext<SignMultisigERC20TransferInputRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = provider.signMultisigERC20TransferInput(req);
  },

  HashForSignature: async function (ctx: ImplContext<HashForSignatureRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = provider.hashForSignature(req);
  },

  DecodeTransaction: async function (ctx: ImplContext<DecodeTransactionRequest, TransactionParams>) {
    const req = ctx.call.request;
    ctx.body = provider.decodeTransaction(req);
  },
};
