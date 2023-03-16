import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

import { provider } from '@src/providers/chain-state/cosmos';
import { ImplementationContext, ProxyUntypedServiceImplementation } from '@src/utils/context';

import { ProtoGrpcType } from '@src/__proto__/cosmos';
import {
  DeployAccountRequest,
  DeployMultisigAccountRequest,
  DeployAccountReply,
  CosmosHandlers,
  BuildTransferTransactionRequest,
  BuildMultisigTransferTransactionRequest,
  SignTransactionRequest,
  SendTransactionRequest,
  DecodeTransactionRequest,
  TransactionParams,
  RebuildTransactionRequest,
  SignMultisigTransactionRequest,

  // staking
  BuildDelegateTransactionRequest,
  BuildUndelegateTransactionRequest,
  BuildRedelegateTransactionRequest,
  BuildWithdrawDelegationRewardTransactionRequest,

  // multisig staking
  BuildMultisigDelegateTransactionRequest,
  BuildMultisigUndelegateTransactionRequest,
  BuildMultisigRedelegateTransactionRequest,
  BuildMultisigWithdrawDelegationRewardTransactionRequest,
} from '@src/__proto__/cosmos/types';
import { TransactionReply } from '@src/__proto__/common/TransactionReply';

const filename = path.join(__dirname, '../../../proto/cosmos.proto');
const options = {
  longs: String,
  defaults: false,
  oneofs: true,
};
const packageDefinition = protoLoader.loadSync(filename, options);
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as unknown as ProtoGrpcType;

export const CosmosService = protoDescriptor.cosmos.Cosmos.service;

export const CosmosImplementation: ProxyUntypedServiceImplementation<CosmosHandlers> = {
  DeployAccount: function (ctx: ImplementationContext<DeployAccountRequest, DeployAccountReply>) {
    const req = ctx.call.request;
    ctx.body = provider.deployAccount(req);
  },

  BuildTransferTransaction: async function (ctx: ImplementationContext<BuildTransferTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildTransferTransaction(req);
  },

  SignTransaction: async function (ctx: ImplementationContext<SignTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.signTransaction(req);
  },

  SendTransaction: async function (ctx: ImplementationContext<SendTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.sendTransaction(req);
  },

  DecodeTransaction: async function (ctx: ImplementationContext<DecodeTransactionRequest, TransactionParams>) {
    const req = ctx.call.request;
    ctx.body = await provider.decodeTransaction(req);
  },

  RebuildTransaction: async function (ctx: ImplementationContext<RebuildTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.rebuildTransaction(req);
  },

  DeployMultisigAccount: function (ctx: ImplementationContext<DeployMultisigAccountRequest, DeployAccountReply>) {
    const req = ctx.call.request;
    ctx.body = provider.deployMultisigAccount(req);
  },

  BuildMultisigTransferTransaction: async function (ctx: ImplementationContext<BuildMultisigTransferTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildMultisigTransferTransaction(req);
  },

  SignMultisigTransaction: async function (ctx: ImplementationContext<SignMultisigTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.signMultisigTransaction(req);
  },

  // staking
  BuildDelegateTransaction: async function (ctx: ImplementationContext<BuildDelegateTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildDelegateTransaction(req);
  },

  BuildUndelegateTransaction: async function (ctx: ImplementationContext<BuildUndelegateTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildUndelegateTransaction(req);
  },

  BuildRedelegateTransaction: async function (ctx: ImplementationContext<BuildRedelegateTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildRedelegateTransaction(req);
  },

  BuildWithdrawDelegationRewardTransaction: async function (
    ctx: ImplementationContext<BuildWithdrawDelegationRewardTransactionRequest, TransactionReply>,
  ) {
    const req = ctx.call.request;
    ctx.body = await provider.buildWithdrawDelegationRewardTransaction(req);
  },

  // multisig staking
  BuildMultisigDelegateTransaction: async function (ctx: ImplementationContext<BuildMultisigDelegateTransactionRequest, TransactionReply>) {
    const req = ctx.call.request;
    ctx.body = await provider.buildMultisigDelegateTransaction(req);
  },

  BuildMultisigUndelegateTransaction: async function (
    ctx: ImplementationContext<BuildMultisigUndelegateTransactionRequest, TransactionReply>,
  ) {
    const req = ctx.call.request;
    ctx.body = await provider.buildMultisigUndelegateTransaction(req);
  },

  BuildMultisigRedelegateTransaction: async function (
    ctx: ImplementationContext<BuildMultisigRedelegateTransactionRequest, TransactionReply>,
  ) {
    const req = ctx.call.request;
    ctx.body = await provider.buildMultisigRedelegateTransaction(req);
  },

  BuildMultisigWithdrawDelegationRewardTransaction: async function (
    ctx: ImplementationContext<BuildMultisigWithdrawDelegationRewardTransactionRequest, TransactionReply>,
  ) {
    const req = ctx.call.request;
    ctx.body = await provider.buildMultisigWithdrawDelegationRewardTransaction(req);
  },
};
