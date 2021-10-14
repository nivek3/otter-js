export const CosmosRefSchema = {
  $id: 'base',
  definitions: {
    network: {
      type: 'object',
      properties: {
        chainId: { type: 'string' },
        provider: { type: 'string' },
        bech32Prefix: { type: 'string' },
        derivePath: { type: 'string' },
      },
    },
    amount: {
      type: 'object',
      required: ['amount', 'denom'],
      properties: {
        amount: { type: 'string' },
        denom: { type: 'string' },
      },
    },
    fee: {
      type: 'object',
      required: ['amount', 'gas'],
      properties: {
        amount: { $ref: '#/definitions/amount' },
        gas: { type: 'string' },
      },
    },
    params: {
      type: 'object',
      properties: {
        fee: { $ref: '#/definitions/fee' },
        accountNumber: { type: 'integer' },
        sequence: { type: 'integer' },
        memo: { type: 'string' },
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
  required: ['key', 'network'],
  properties: {
    key: { type: 'string' },
    network: { $ref: 'base#/definitions/network', type: 'object', required: ['bech32Prefix'] },
  },
};

export const BuildTransferTransactionRequestSchema = {
  type: 'object',
  required: ['from', 'to', 'amount', 'params'],
  properties: {
    network: { $ref: 'base#/definitions/network' },
    from: { type: 'string' },
    to: { type: 'string' },
    amount: { $ref: 'base#/definitions/amount' },
    params: { $ref: 'base#/definitions/params', type: 'object', required: ['fee'] },
  },
};

export const SignTransactionRequestSchema = {
  type: 'object',
  required: ['serialized', 'signatures'],
  properties: {
    serialized: { type: 'string' },
    signatures: { type: 'array', items: { $ref: 'base#/definitions/signature' } },
  },
};

export const SendTransactionRequestSchema = {
  type: 'object',
  required: ['serialized', 'network'],
  properties: {
    network: { $ref: 'base#/definitions/network', type: 'object', required: ['provider'] },
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
  required: ['network', 'serialized', 'params'],
  properties: {
    network: { $ref: 'base#/definitions/network', type: 'object', required: ['chainId'] },
    serialized: { type: 'string' },
    params: {
      $ref: 'base#/definitions/params',
      type: 'object',
      required: ['fee'],
      properties: {
        fee: { $ref: 'base#/definitions/params', type: 'object', required: ['gas'] },
      },
    },
  },
};
