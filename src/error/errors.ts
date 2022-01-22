import { status as GRpcStatus } from '@grpc/grpc-js';

export const errors = {
  INVALID_ARGUMENT: {
    code: GRpcStatus.INVALID_ARGUMENT,
    status: 400,
    errno: '40000',
    details: 'Invalid argument',
  },
  INVALID_NETWORK: {
    code: GRpcStatus.INVALID_ARGUMENT,
    status: 400,
    errno: '40001',
    details: 'Invalid network',
  },
  INVALID_UTXOS: {
    code: GRpcStatus.INVALID_ARGUMENT,
    status: 400,
    errno: '40002',
    details: 'Invalid utxos',
  },
  NOT_ENOUGH_BALANCE: {
    code: GRpcStatus.INVALID_ARGUMENT,
    status: 400,
    errno: '40003',
    details: 'Not enough balance',
  },
  NO_MATCHING_UTXO_FOUND: {
    code: GRpcStatus.INVALID_ARGUMENT,
    status: 400,
    errno: '40004',
    details: 'No matching utxo found',
  },
  VERIFY_SIGNATURE_FAILED: {
    code: GRpcStatus.INVALID_ARGUMENT,
    status: 400,
    errno: '40005',
    details: 'Verify signature failed',
  },
  NO_MATCHING_PUBKEY_FOUND: {
    code: GRpcStatus.INVALID_ARGUMENT,
    status: 400,
    errno: '40006',
    details: 'No matching pubKey found',
  },
  MAKE_REQUEST_FAILED: {
    code: GRpcStatus.UNKNOWN,
    status: 500,
    errno: '40007',
    details: 'Make request failed',
  },
  INVALID_SIGNATURES: {
    code: GRpcStatus.INVALID_ARGUMENT,
    status: 400,
    errno: '40008',
    details: 'Invalid signatures',
  },
  REQUIRE_RECIPIENTS: {
    code: GRpcStatus.INVALID_ARGUMENT,
    status: 400,
    errno: '40009',
    details: 'Require recipients',
  },
  REQUIRE_TRANSACTIONS: {
    code: GRpcStatus.INVALID_ARGUMENT,
    status: 400,
    errno: '40010',
    details: 'Require transactions',
  },
  CREATE_API_FAILED: {
    code: GRpcStatus.INVALID_ARGUMENT,
    status: 400,
    errno: '40011',
    details: 'Create api failed',
  },
  MULTISIG_ADDRESS_UNMATCHED: {
    code: GRpcStatus.INVALID_ARGUMENT,
    status: 400,
    errno: '40012',
    details: 'Multsig address unmatched',
  },
  TIME_POINT_NOT_FOUND: {
    code: GRpcStatus.INVALID_ARGUMENT,
    status: 400,
    errno: '40013',
    details: 'Time point not found',
  },
  TIME_POINT_FOUND: {
    code: GRpcStatus.INVALID_ARGUMENT,
    status: 400,
    errno: '40014',
    details: 'Time point found',
  },
  BROADCAST_FAILED: {
    code: GRpcStatus.INVALID_ARGUMENT,
    status: 400,
    errno: '40015',
    details: 'broadcast signed tx failed',
  },
  INTERNAL: {
    code: GRpcStatus.INTERNAL,
    status: 500,
    errno: '50000',
    details: 'internal error',
  },
};
