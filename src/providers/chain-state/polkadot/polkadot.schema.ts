export const PolkadotRefSchema = {
  $id: 'base',
  definitions: {
    network: {
      type: 'object',
      properties: {
        provider: { type: 'string' },
        ss58Format: { type: 'integer' },
      },
    },
    params: {
      type: 'object',
      properties: {
        maxWeight: { type: 'integer' },
        nonce: { type: 'integer' },
      },
    },
    signature: {
      type: 'object',
      minProperties: 1,
      properties: {
        pubKey: { type: 'string' },
        hash: { type: 'string' },
        signature: { type: 'string', pattern: '^(0x)?[A-Za-z0-9]{130}$' },
      },
    },
    recipient: {
      type: 'object',
      required: ['address', 'value'],
      properties: {
        address: { type: 'string' },
        value: { type: 'string' },
      },
    },
  },
};

export const DeployAccountRequestSchema = {
  type: 'object',
  required: ['key'],
  properties: {
    key: { type: 'string' },
    network: { $ref: 'base#/definitions/network' },
  },
};

export const DeployMultisigAccountRequestSchema = {
  type: 'object',
  required: ['network', 'keys', 'threshold'],
  properties: {
    network: { $ref: 'base#/definitions/network' },
    keys: { type: 'array', uniqueItems: true, items: { type: 'string' } },
    threshold: { type: 'integer' },
  },
};

export const BuildTransferRequestSchema = {
  type: 'object',
  required: ['network', 'from', 'to', 'quantity'],
  properties: {
    network: { $ref: 'base#/definitions/network' },
    from: { type: 'string' },
    to: { type: 'string' },
    quantity: { type: 'string' },
    params: { $ref: 'base#/definitions/params' },
  },
};

export const BuildMultisigApproveAsMultiRequestSchema = {
  type: 'object',
  required: ['network', 'callHash', 'callHex', 'pubKeys', 'threshold', 'signer'],
  properties: {
    network: { $ref: 'base#/definitions/network' },
    params: { $ref: 'base#/definitions/params' },
    pubKeys: { type: 'array', uniqueItems: true, items: { type: 'string' } },
    threshold: { type: 'integer' },
    callHash: { type: 'string' },
    callHex: { type: 'string' },
    signer: { type: 'string' },
  },
};
export const BuildMultisigAsMultiRequestSchema = {
  type: 'object',
  required: ['network', 'callHash', 'callHex', 'pubKeys', 'threshold', 'signer'],
  properties: {
    network: { $ref: 'base#/definitions/network' },
    params: { $ref: 'base#/definitions/params' },
    pubKeys: { type: 'array', uniqueItems: true, items: { type: 'string' } },
    threshold: { type: 'integer' },
    callHash: { type: 'string' },
    callHex: { type: 'string' },
    signer: { type: 'string' },
  },
};

export const BuildMultisigCancelRequestSchema = {
  type: 'object',
  required: ['network', 'callHash', 'callHex', 'pubKeys', 'threshold', 'signer'],
  properties: {
    network: { $ref: 'base#/definitions/network' },
    params: { $ref: 'base#/definitions/params' },
    pubKeys: { type: 'array', uniqueItems: true, items: { type: 'string' } },
    threshold: { type: 'integer' },
    callHash: { type: 'string' },
    callHex: { type: 'string' },
    signer: { type: 'string' },
  },
};

export const SignTransactionRequestSchema = {
  type: 'object',
  required: ['network', 'serialized', 'signatures'],
  properties: {
    network: { $ref: 'base#/definitions/network' },
    serialized: { type: 'string' },
    signatures: { type: 'array', items: { $ref: 'base#/definitions/signature' } },
  },
};

export const SendTransactionRequestSchema = {
  type: 'object',
  required: ['network', 'serialized'],
  properties: {
    network: { $ref: 'base#/definitions/network' },
    serialized: { type: 'string' },
  },
};

export const BuildBatchTransferTransactionRequestSchema = {
  type: 'object',
  required: ['network', 'recipients', 'signer'],
  properties: {
    network: { $ref: 'base#/definitions/network' },
    recipients: { type: 'array', items: { $ref: 'base#/definitions/recipient' } },
    signer: { type: 'string' },
    params: { $ref: 'base#/definitions/params' },
  },
};

export const BuildBatchTransactionRequestSchema = {
  type: 'object',
  required: ['network', 'txs', 'signer'],
  properties: {
    network: { $ref: 'base#/definitions/network' },
    txs: { type: 'array', uniqueItems: true, items: { type: 'string' } },
    signer: { type: 'string' },
    params: { $ref: 'base#/definitions/params' },
  },
};

export const RebuildTransactionRequestSchema = {
  type: 'object',
  required: ['network', 'serialized'],
  properties: {
    network: { $ref: 'base#/definitions/network' },
    params: { $ref: 'base#/definitions/params' },
    serialized: { type: 'string' },
  },
};

export const HashForSignatureRequestSchema = {
  type: 'object',
  required: ['network', 'serialized'],
  properties: {
    network: { $ref: 'base#/definitions/network' },
    serialized: { type: 'string' },
    pubKey: { type: 'string' },
  },
};

export const DecodeTransactionRequestSchema = {
  type: 'object',
  required: ['serialized'],
  properties: {
    serialized: { type: 'string' },
  },
};

export const BuildStakingBondAndNominateTransactionSchema = {
  type: 'object',
  required: ['network', 'from', 'controller', 'quantity', 'targets'],
  properties: {
    network: { $ref: 'base#/definitions/network' },
    params: { $ref: 'base#/definitions/params' },
    from: { type: 'string' },
    controller: { type: 'string' },
    quantity: { type: 'string' },
    targets: { type: 'array', uniqueItems: true, items: { type: 'string' } },
  },
};

export const BuildStakingNominateTransactionSchema = {
  type: 'object',
  required: ['network', 'from', 'targets'],
  properties: {
    network: { $ref: 'base#/definitions/network' },
    params: { $ref: 'base#/definitions/params' },
    from: { type: 'string' },
    targets: { type: 'array', uniqueItems: true, items: { type: 'string' } },
  },
};

export const BuildStakingBondExtraTransactionSchema = {
  type: 'object',
  required: ['network', 'from', 'maxAdditional'],
  properties: {
    network: { $ref: 'base#/definitions/network' },
    params: { $ref: 'base#/definitions/params' },
    from: { type: 'string' },
    maxAdditional: { type: 'string' },
  },
};

export const BuildStakingUnbondTransactionSchema = {
  type: 'object',
  required: ['network', 'from', 'quantity'],
  properties: {
    network: { $ref: 'base#/definitions/network' },
    params: { $ref: 'base#/definitions/params' },
    from: { type: 'string' },
    quantity: { type: 'string' },
  },
};

export const BuildStakingWithdrawUnbondedTransactionSchema = {
  type: 'object',
  required: ['network', 'from', 'numSlashingSpans'],
  properties: {
    network: { $ref: 'base#/definitions/network' },
    params: { $ref: 'base#/definitions/params' },
    from: { type: 'string' },
    numSlashingSpans: { type: 'string' },
  },
};
