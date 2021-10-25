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

export const BuildMultisigTransferRequestSchema = {
  type: 'object',
  required: ['network', 'to', 'quantity', 'pubKeys', 'threshold', 'sender'],
  properties: {
    network: { $ref: 'base#/definitions/network' },
    to: { type: 'string' },
    quantity: { type: 'string' },
    pubKeys: { type: 'array', uniqueItems: true, items: { type: 'string' } },
    threshold: { type: 'integer' },
    sender: { type: 'string' },
    params: { $ref: 'base#/definitions/params' },
  },
};

export const BuildMultisigApproveRequestSchema = {
  type: 'object',
  required: ['network', 'to', 'quantity', 'pubKeys', 'threshold', 'sender'],
  properties: {
    network: { $ref: 'base#/definitions/network' },
    to: { type: 'string' },
    quantity: { type: 'string' },
    pubKeys: { type: 'array', uniqueItems: true, items: { type: 'string' } },
    threshold: { type: 'integer' },
    sender: { type: 'string' },
    params: { $ref: 'base#/definitions/params' },
  },
};

export const BuildMultisigCancelRequestSchema = {
  type: 'object',
  required: ['network', 'to', 'quantity', 'pubKeys', 'threshold', 'sender'],
  properties: {
    network: { $ref: 'base#/definitions/network' },
    to: { type: 'string' },
    quantity: { type: 'string' },
    pubKeys: { type: 'array', uniqueItems: true, items: { type: 'string' } },
    threshold: { type: 'integer' },
    sender: { type: 'string' },
    params: { $ref: 'base#/definitions/params' },
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
  required: ['network', 'recipients', 'sender'],
  properties: {
    network: { $ref: 'base#/definitions/network' },
    recipients: { type: 'array', items: { $ref: 'base#/definitions/recipient' } },
    sender: { type: 'string' },
    params: { $ref: 'base#/definitions/params' },
  },
};

export const BuildBatchTransactionRequestSchema = {
  type: 'object',
  required: ['network', 'txs', 'sender'],
  properties: {
    network: { $ref: 'base#/definitions/network' },
    txs: { type: 'array', uniqueItems: true, items: { type: 'string' } },
    sender: { type: 'string' },
    params: { $ref: 'base#/definitions/params' },
  },
};

export const RebuildTransactionRequestSchema = {
  type: 'object',
  required: ['network', 'serialized'],
  properties: {
    network: { $ref: 'base#/definitions/network' },
    serialized: { type: 'string' },
    params: { $ref: 'base#/definitions/params' },
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
