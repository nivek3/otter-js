import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { provider } from '@src/providers/chain-state/ethereum/core/ethereum';
import { ImplContext, ProxyImp } from '@src/utils/context';

import { ProtoGrpcType } from '@src/__proto__/ethereum.core';
import { TransactionReply } from '@src/__proto__/common/types';
import { TransactionParams } from '@src/__proto__/ethereum/common/types';
import {
  BuildTransactionRequest,
  DeployAccountRequest,
  DeployAccountReply,
  EthereumHandlers,
  BuildTransferTransactionRequest,
  BuildERC20TransferTransactionRequest,
  SignTransactionRequest,
  RebuildTransactionRequest,
  SendTransactionRequest,
  HashForSignatureRequest,
  DecodeTransactionRequest,
  BuildContractTransactionRequest,
} from '@src/__proto__/ethereum/core/types';

const filename = path.join(__dirname, '../../../../../proto/ethereum/ethereum.core.proto');
const options = {
  longs: String,
  defaults: false,
  oneofs: true,
};
const packageDefinition = protoLoader.loadSync(filename, options);
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as unknown as ProtoGrpcType;

export const EthereumCoreService = protoDescriptor.ethereum.core.Ethereum.service;

export const EthereumCoreImp: ProxyImp<EthereumHandlers> = {
  DeployAccount: function (ctx: ImplContext<DeployAccountRequest, DeployAccountReply>) {
    const req = ctx.call.request;
    const address = provider.deployAccount(req);
    ctx.body = { address };
  },

  BuildTransferTransaction: async function (ctx: ImplContext<BuildTransferTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildTransferTransaction(req);
  },

  BuildERC20TransferTransaction: async function (ctx: ImplContext<BuildERC20TransferTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildERC20TransferTransaction(req);
  },

  BuildContractTransaction: async function (ctx: ImplContext<BuildContractTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildContractTransaction(req);
  },

  SignTransaction: async function (ctx: ImplContext<SignTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = provider.signTransaction(req);
  },

  BuildTransaction: async function (ctx: ImplContext<BuildTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildTransaction(req);
  },

  RebuildTransaction: async function (ctx: ImplContext<RebuildTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.rebuildTransaction(req);
  },

  SendTransaction: async function (ctx: ImplContext<SendTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.sendTransaction(req);
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
