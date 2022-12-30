import path from 'path';
import * as grpc from '@grpc/grpc-js';

import * as protoLoader from '@grpc/proto-loader';
import { provider } from '@src/providers/chain-state/ethereum/core/ethereum';
import { ImplementationContext, ProxyUntypedServiceImplementation } from '@src/utils/context';

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
  BuildContractExecutionTransactionInputRequest,
  BuildContractExecutionTransactionInputReply,
  BuildContractTransactionRequest,
  DecodeRawTransactionRequest,
  DecodeRawTransactionReply,
  GetFeeDataRequest,
  GetFeeDataReply,
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

export const EthereumCoreImplementation: ProxyUntypedServiceImplementation<EthereumHandlers> = {
  DeployAccount: function (ctx: ImplementationContext<DeployAccountRequest, DeployAccountReply>) {
    const req = ctx.call.request;
    const address = provider.deployAccount(req);
    ctx.body = { address };
  },

  BuildTransferTransaction: async function (ctx: ImplementationContext<BuildTransferTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildTransferTransaction(req);
  },

  BuildERC20TransferTransaction: async function (ctx: ImplementationContext<BuildERC20TransferTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildERC20TransferTransaction(req);
  },

  BuildContractExecutionTransactionInput: async function (
    ctx: ImplementationContext<BuildContractExecutionTransactionInputRequest, BuildContractExecutionTransactionInputReply>,
  ) {
    const req = ctx.call.request;
    ctx.body = await provider.buildContractExecutionTransactionInput(req);
  },

  BuildContractTransaction: async function (ctx: ImplementationContext<BuildContractTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildContractTransaction(req);
  },

  SignTransaction: async function (ctx: ImplementationContext<SignTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = provider.signTransaction(req);
  },

  BuildTransaction: async function (ctx: ImplementationContext<BuildTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildTransaction(req);
  },

  RebuildTransaction: async function (ctx: ImplementationContext<RebuildTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.rebuildTransaction(req);
  },

  SendTransaction: async function (ctx: ImplementationContext<SendTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.sendTransaction(req);
  },

  HashForSignature: async function (ctx: ImplementationContext<HashForSignatureRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = provider.hashForSignature(req);
  },

  DecodeTransaction: async function (ctx: ImplementationContext<DecodeTransactionRequest, TransactionParams>) {
    const req = ctx.call.request;
    ctx.body = provider.decodeTransaction(req);
  },

  DecodeRawTransaction: async function (ctx: ImplementationContext<DecodeRawTransactionRequest, DecodeRawTransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.decodeRawTransaction(req);
  },

  GetFeeData: async function (ctx: ImplementationContext<GetFeeDataRequest, GetFeeDataReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.getFeeData(req);
  },
};
