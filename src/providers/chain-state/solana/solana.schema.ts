export const SolanaRefSchema = {
  $id: 'base',
  definitions: {
    network: {
      type: 'object',
      required: ['provider'],
      properties: {
        provider: { type: 'string' },
      },
    },
    params: {
      type: 'object',
      properties: {
        recentBlockhash: { type: 'string' },
      },
    },
    signature: {
      type: 'object',
      minProperties: 1,
      properties: {
        pubKey: { type: 'string' },
        hash: { type: 'string' },
        signature: { type: 'string' },
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

export const BuildTransferTransactionRequestSchema = {
  type: 'object',
  required: ['network', 'from', 'to', 'quantity'],
  properties: {
    network: { type: 'object', $ref: 'base#/definitions/network' },
    params: { type: 'object', $ref: 'base#/definitions/params' },
    from: { type: 'string' },
    to: { type: 'string' },
    quantity: { type: 'string' },
  },
};

export const BuildTokenTransferTransactionRequestSchema = {
  type: 'object',
  required: ['network', 'from', 'to', 'quantity', 'mintAddress', 'decimals'],
  properties: {
    network: { type: 'object', $ref: 'base#/definitions/network' },
    params: { type: 'object', $ref: 'base#/definitions/params' },
    from: { type: 'string' },
    to: { type: 'string' },
    mintAddress: { type: 'string' },
    decimals: { type: 'integer' },
    quantity: { type: 'string' },
  },
};

export const SignTransactionRequestSchema = {
  type: 'object',
  required: ['serialized', 'signatures'],
  properties: {
    serialized: { type: 'string' },
    signatures: { type: 'array', items: { $ref: 'base#/definitions/signature', type: 'object', required: ['signature'] } },
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

export const DecodeTransactionRequestSchema = {
  type: 'object',
  required: ['serialized'],
  properties: {
    serialized: { type: 'string' },
  },
};

export const RebuildTransactionRequestSchema = {
  type: 'object',
  required: ['network', 'serialized'],
  properties: {
    network: { type: 'object', $$ref: 'base#/definitions/network' },
    params: { type: 'object', $$ref: 'base#/definitions/params' },
    serialized: { type: 'string' },
  },
};
