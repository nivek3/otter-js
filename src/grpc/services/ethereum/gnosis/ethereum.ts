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

export const EthereumGnosisImp: ProxyImp<EthereumHandlers> = {
  GetAccountAddress: async function (ctx: ImplContext<GetAccountAddressRequest, GetAccountAddressReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.getAccountAddress(req);
  },

  BuildAccountTransaction: async function (ctx: ImplContext<BuildAccountTransactionRequest, BuildAccountTransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildAccountTransaction(req);
  },

  BuildMultisigInput: async function (ctx: ImplContext<BuildMultisigInputRequest, BuildSafeInputReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildMultisigInput(req);
  },

  SignMultisigInput: async function (ctx: ImplContext<SignMultisigInputRequest, BuildSafeInputReply>) {
    const req = ctx.call.request;
    ctx.body = provider.signMultisigInput(req);
  },

  BuildMultisigTransferInput: async function (ctx: ImplContext<BuildMultisigTransferInputRequest, BuildSafeInputReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildMultisigTransferInput(req);
  },

  BuildMultisigTransaction: async function (ctx: ImplContext<BuildMultisigTransactionRequest, BuildSafeInputReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildMultisigTransaction(req);
  },

  BuildMultisigERC20TransferInput: async function (ctx: ImplContext<BuildMultisigERC20TransferInputRequest, BuildSafeInputReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildMultisigERC20TransferInput(req);
  },

  BuildMultiSendInput: async function (ctx: ImplContext<BuildMultiSendInputRequest, BuildSafeInputReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildMultiSendInput(req);
  },

  // owner manager
  BuildAddOwnerWithThresholdInput: async function (ctx: ImplContext<BuildAddOwnerWithThresholdInputRequest, BuildSafeInputReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildAddOwnerWithThresholdInput(req);
  },

  BuildChangeThresholdInput: async function (ctx: ImplContext<BuildChangeThresholdInputRequest, BuildSafeInputReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildChangeThresholdInput(req);
  },

  BuildRemoveOwnerInput: async function (ctx: ImplContext<BuildRemoveOwnerInputRequest, BuildSafeInputReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildRemoveOwnerInput(req);
  },

  BuildSwapOwnerInput: async function (ctx: ImplContext<BuildSwapOwnerInputRequest, BuildSafeInputReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildSwapOwnerInput(req);
  },
};
