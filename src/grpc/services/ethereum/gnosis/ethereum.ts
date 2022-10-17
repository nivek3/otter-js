import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { provider } from '@src/providers/chain-state/ethereum/gnosis/ethereum';
import { ImplementationContext, ProxyUntypedServiceImplementation } from '@src/utils/context';

import { ProtoGrpcType } from '@src/__proto__/ethereum.gnosis';
import { TransactionReply } from '@src/__proto__/common/types';
import {
  EthereumHandlers,
  BuildAccountTransactionRequest,
  BuildAccountTransactionReply,
  BuildTransferInputRequest,
  SignInputRequest,
  BuildTransactionRequest,
  BuildERC20TransferInputRequest,
  GetAccountAddressRequest,
  GetAccountAddressReply,
  BuildInputRequest,
  BuildMultiSendInputRequest,
  BuildSafeInputReply,
  // owner manger
  BuildAddOwnerWithThresholdInputRequest,
  BuildChangeThresholdInputRequest,
  BuildRemoveOwnerInputRequest,
  BuildSwapOwnerInputRequest,
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

export const EthereumGnosisImplementation: ProxyUntypedServiceImplementation<EthereumHandlers> = {
  GetAccountAddress: async function (ctx: ImplementationContext<GetAccountAddressRequest, GetAccountAddressReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.getAccountAddress(req);
  },

  BuildAccountTransaction: async function (ctx: ImplementationContext<BuildAccountTransactionRequest, BuildAccountTransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildAccountTransaction(req);
  },

  BuildInput: async function (ctx: ImplementationContext<BuildInputRequest, BuildSafeInputReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildInput(req);
  },

  signInput: async function (ctx: ImplementationContext<SignInputRequest, BuildSafeInputReply>) {
    const req = ctx.call.request;
    ctx.body = provider.signInput(req);
  },

  BuildTransferInput: async function (ctx: ImplementationContext<BuildTransferInputRequest, BuildSafeInputReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildTransferInput(req);
  },

  BuildTransaction: async function (ctx: ImplementationContext<BuildTransactionRequest, BuildSafeInputReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildTransaction(req);
  },

  BuildERC20TransferInput: async function (ctx: ImplementationContext<BuildERC20TransferInputRequest, BuildSafeInputReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildERC20TransferInput(req);
  },

  BuildMultiSendInput: async function (ctx: ImplementationContext<BuildMultiSendInputRequest, BuildSafeInputReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildMultiSendInput(req);
  },

  // owner manager
  BuildAddOwnerWithThresholdInput: async function (
    ctx: ImplementationContext<BuildAddOwnerWithThresholdInputRequest, BuildSafeInputReply>,
  ) {
    const req = ctx.call.request;
    ctx.body = await provider.buildAddOwnerWithThresholdInput(req);
  },

  BuildChangeThresholdInput: async function (ctx: ImplementationContext<BuildChangeThresholdInputRequest, BuildSafeInputReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildChangeThresholdInput(req);
  },

  BuildRemoveOwnerInput: async function (ctx: ImplementationContext<BuildRemoveOwnerInputRequest, BuildSafeInputReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildRemoveOwnerInput(req);
  },

  BuildSwapOwnerInput: async function (ctx: ImplementationContext<BuildSwapOwnerInputRequest, BuildSafeInputReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildSwapOwnerInput(req);
  },
};
