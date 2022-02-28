export const EthereumRefSchema = {
  $id: 'base',
  definitions: {
    network: {
      type: 'object',
      required: ['provider', 'chainId'],
      properties: {
        provider: { type: 'string' },
        chainId: { type: 'integer' },
      },
    },
    params: {
      type: 'object',
      properties: {
        gasLimit: { type: 'string' },
        gasPrice: { type: 'string' },
        nonce: { type: 'integer' },
      },
    },
    signature: {
      type: 'object',
      minProperties: 1,
      properties: {
        pubKey: { type: 'string' },
        hash: { type: 'string' },
        signature: { type: 'string', pattern: '^(0x)?[A-Za-z0-9]{66}$|^(0x)?[A-Za-z0-9]{130}$' },
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
    network: { $ref: 'base#/definitions/network' },
    from: { type: 'string' },
    to: { type: 'string' },
    quantity: { type: 'string' },
    params: { $ref: 'base#/definitions/params' },
  },
};

export const BuildERC20TransferTransactionRequestSchema = {
  type: 'object',
  required: ['network', 'from', 'to', 'quantity', 'tokenAddress'],
  properties: {
    network: { $ref: 'base#/definitions/network' },
    from: { type: 'string' },
    to: { type: 'string' },
    quantity: { type: 'string' },
    params: { $ref: 'base#/definitions/params' },
  },
};

export const SignTransactionRequestSchema = {
  type: 'object',
  required: ['network', 'serialized', 'signatures'],
  properties: {
    network: { $ref: 'base#/definitions/network' },
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

export const BuildTransactionRequestSchema = {
  type: 'object',
  required: ['network', 'from', 'to', 'value', 'data'],
  properties: {
    network: { $ref: 'base#/definitions/network' },
    from: { type: 'string' },
    to: { type: 'string' },
    value: { type: 'string' },
    data: { type: 'string' },
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

export const BuildContractTransactionRequestSchema = {
  type: 'object',
  required: ['network', 'from', 'contractAddress', 'abis', 'method', 'args'],
  properties: {
    network: { $ref: 'base#/definitions/network' },
    from: { type: 'string' },
    contractAddress: { type: 'string' },
    abis: { type: 'array', uniqueItems: true, items: { type: 'string' } },
    method: { type: 'string' },
    args: { type: 'array', uniqueItems: true, items: { type: 'string' } },
  },
};
