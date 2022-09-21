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
  BuildMultisigTransferInputRequest,
  SignMultisigInputRequest,
  BuildMultisigTransactionRequest,
  BuildMultisigERC20TransferInputRequest,
  GetAccountAddressRequest,
  GetAccountAddressReply,
  BuildMultisigInputRequest,
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

  BuildMultisigInput: async function (ctx: ImplementationContext<BuildMultisigInputRequest, BuildSafeInputReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildMultisigInput(req);
  },

  SignMultisigInput: async function (ctx: ImplementationContext<SignMultisigInputRequest, BuildSafeInputReply>) {
    const req = ctx.call.request;
    ctx.body = provider.signMultisigInput(req);
  },

  BuildMultisigTransferInput: async function (ctx: ImplementationContext<BuildMultisigTransferInputRequest, BuildSafeInputReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildMultisigTransferInput(req);
  },

  BuildMultisigTransaction: async function (ctx: ImplementationContext<BuildMultisigTransactionRequest, BuildSafeInputReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildMultisigTransaction(req);
  },

  BuildMultisigERC20TransferInput: async function (
    ctx: ImplementationContext<BuildMultisigERC20TransferInputRequest, BuildSafeInputReply>,
  ) {
    const req = ctx.call.request;
    ctx.body = await provider.buildMultisigERC20TransferInput(req);
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
