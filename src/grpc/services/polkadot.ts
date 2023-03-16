import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

import { provider } from '@src/providers/chain-state/polkadot';
import { ImplementationContext, ProxyUntypedServiceImplementation } from '@src/utils/context';

import { ProtoGrpcType } from '@src/__proto__/polkadot';
import { TransactionReply } from '@src/__proto__/common/types';
import {
  TransactionParams,
  PolkadotHandlers,
  DeployAccountRequest,
  DeployAccountReply,
  BuildTransferRequest,
  SendTransactionRequest,
  BuildBatchTransferTransactionRequest,
  BuildBatchTransactionRequest,
  RebuildTransactionRequest,
  DecodeTransactionRequest,
  // multisig
  BuildMultisigApproveAsMultiRequest,
  BuildMultisigAsMultiRequest,
  BuildMultisigCancelAsMultiRequest,

  // staking
  BuildStakingBondAndNominateTransactionRequest,
  BuildStakingNominateTransactionRequest,
  BuildStakingBondExtraTransactionRequest,
  BuildStakingUnbondTransactionRequest,
  BuildStakingWithdrawUnbondedTransactionRequest,
  BuildStakingPayoutStakersTransactionRequest,

  // Query
  QueryStakingPayoutStakersRequest,
  QueryStakingPayoutStakersReply,
} from '@src/__proto__/polkadot/types';

const filename = path.join(__dirname, '../../../proto/polkadot.proto');
const options = {
  longs: String,
  defaults: false,
  oneofs: true,
};
const packageDefinition = protoLoader.loadSync(filename, options);
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as unknown as ProtoGrpcType;

export const PolkadotService = protoDescriptor.polkadot.Polkadot.service;

export const PolkadotImplementation: ProxyUntypedServiceImplementation<PolkadotHandlers> = {
  DeployAccount: function (ctx: ImplementationContext<DeployAccountRequest, DeployAccountReply>) {
    const req = ctx.call.request;
    const address = provider.deployAccount(req);
    ctx.body = { address };
  },

  DeployMultisigAccount: function (ctx: ImplementationContext<DeployAccountRequest, DeployAccountReply>) {
    const req = ctx.call.request;
    const address = provider.deployMultisigAccount(req);
    ctx.body = { address };
  },

  BuildTransferTransaction: async function (ctx: ImplementationContext<BuildTransferRequest, TransactionReply>): Promise<void> {
    const req = ctx.call.request;
    ctx.body = await provider.buildTransferTransaction(req);
  },

  BuildMultisigApproveAsMultiTransaction: async function (
    ctx: ImplementationContext<BuildMultisigApproveAsMultiRequest, TransactionReply>,
  ): Promise<void> {
    const req = ctx.call.request;
    ctx.body = await provider.buildMultisigApproveAsMultiTransaction(req);
  },

  BuildMultisigAsMultiTransaction: async function (
    ctx: ImplementationContext<BuildMultisigAsMultiRequest, TransactionReply>,
  ): Promise<void> {
    const req = ctx.call.request;
    ctx.body = await provider.buildMultisigAsMultiTransaction(req);
  },

  BuildMultisigCancelAsMultiTransaction: async function (
    ctx: ImplementationContext<BuildMultisigCancelAsMultiRequest, TransactionReply>,
  ): Promise<void> {
    const req = ctx.call.request;
    ctx.body = await provider.buildMultisigCancelAsMultiTransaction(req);
  },

  SignTransaction: async function (ctx: ImplementationContext<BuildTransferRequest, TransactionReply>): Promise<void> {
    const req = ctx.call.request;
    ctx.body = await provider.signTransaction(req);
  },

  SendTransaction: async function (ctx: ImplementationContext<SendTransactionRequest, TransactionReply>): Promise<void> {
    const req = ctx.call.request;
    ctx.body = await provider.sendTransaction(req);
  },

  BuildBatchTransferTransaction: async function (
    ctx: ImplementationContext<BuildBatchTransferTransactionRequest, TransactionReply>,
  ): Promise<void> {
    const req = ctx.call.request;
    ctx.body = await provider.buildBatchTransferTransaction(req);
  },

  BuildBatchTransaction: async function (ctx: ImplementationContext<BuildBatchTransactionRequest, TransactionReply>): Promise<void> {
    const req = ctx.call.request;
    ctx.body = await provider.buildBatchTransaction(req);
  },

  RebuildTransaction: async function (ctx: ImplementationContext<RebuildTransactionRequest, TransactionReply>): Promise<void> {
    const req = ctx.call.request;
    ctx.body = await provider.rebuildTransaction(req);
  },

  DecodeTransaction: async function (ctx: ImplementationContext<DecodeTransactionRequest, TransactionParams>): Promise<void> {
    const req = ctx.call.request;
    ctx.body = await provider.decodeTransaction(req);
  },

  // staking
  BuildStakingBondAndNominateTransaction: async function (
    ctx: ImplementationContext<BuildStakingBondAndNominateTransactionRequest, TransactionReply>,
  ): Promise<void> {
    const req = ctx.call.request;
    ctx.body = await provider.buildStakingBondAndNominateTransaction(req);
  },

  BuildStakingNominateTransaction: async function (
    ctx: ImplementationContext<BuildStakingNominateTransactionRequest, TransactionReply>,
  ): Promise<void> {
    const req = ctx.call.request;
    ctx.body = await provider.buildStakingNominateTransaction(req);
  },

  BuildStakingBondExtraTransaction: async function (
    ctx: ImplementationContext<BuildStakingBondExtraTransactionRequest, TransactionReply>,
  ): Promise<void> {
    const req = ctx.call.request;
    ctx.body = await provider.buildStakingBondExtraTransaction(req);
  },

  BuildStakingUnbondTransaction: async function (
    ctx: ImplementationContext<BuildStakingUnbondTransactionRequest, TransactionReply>,
  ): Promise<void> {
    const req = ctx.call.request;
    ctx.body = await provider.buildStakingUnbondTransaction(req);
  },

  BuildStakingWithdrawUnbondedTransaction: async function (
    ctx: ImplementationContext<BuildStakingWithdrawUnbondedTransactionRequest, TransactionReply>,
  ): Promise<void> {
    const req = ctx.call.request;
    ctx.body = await provider.buildStakingWithdrawUnbondedTransaction(req);
  },

  QueryStakingPayoutStakers: async function (
    ctx: ImplementationContext<QueryStakingPayoutStakersRequest, QueryStakingPayoutStakersReply>,
  ): Promise<void> {
    const req = ctx.call.request;
    ctx.body = await provider.queryStakingPayoutStakers(req);
  },

  BuildStakingPayoutStakersTransaction: async function (
    ctx: ImplementationContext<BuildStakingPayoutStakersTransactionRequest, TransactionReply>,
  ): Promise<void> {
    const req = ctx.call.request;
    ctx.body = await provider.buildStakingPayoutStakersTransaction(req);
  },
};
