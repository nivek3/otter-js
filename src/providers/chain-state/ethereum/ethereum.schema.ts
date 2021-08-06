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

export const BuildAccountTransactionRequestSchema = {
  type: 'object',
  required: ['network', 'keys', 'sender'],
  properties: {
    network: { $ref: 'base#/definitions/network' },
    keys: { type: 'array', uniqueItems: true, items: { type: 'string' } },
    sender: { type: 'string' },
    params: { $ref: 'base#/definitions/params' },
  },
};

export const BuildTransferTransactionRequestSchema = {
  type: 'object',
  required: ['network', 'from', 'to', 'quantity', 'params'],
  properties: {
    network: { $ref: 'base#/definitions/network' },
    from: { type: 'string' },
    to: { type: 'string' },
    quantity: { type: 'string' },
    params: { $ref: 'base#/definitions/params' },
  },
};

export const BuildTokenTransferTransactionRequestSchema = {
  type: 'object',
  required: ['network', 'from', 'to', 'quantity', 'tokenAddress', 'params'],
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

export const RebuildTransactionRequestSchema = {
  type: 'object',
  required: ['network', 'serialized', 'params'],
  properties: {
    network: { $ref: 'base#/definitions/network' },
    serialized: { type: 'string' },
    params: { $ref: 'base#/definitions/params' },
  },
};

export const BuildMultisigTransferInputRequestSchema = {
  type: 'object',
  required: ['toAddress', 'quantity', 'data', 'expireTime', 'sequenceId'],
  properties: {
    toAddress: { type: 'string' },
    quantity: { type: 'string' },
    data: { type: 'string' },
    expireTime: { type: 'integer' },
    sequenceId: { type: 'integer' },
  },
};

export const SignMultisigTransferInputRequestSchema = {
  type: 'object',
  required: ['serialized', 'signatures'],
  properties: {
    serialized: { type: 'string' },
    signatures: { type: 'array', items: { $ref: 'base#/definitions/signature' } },
  },
};

export const BuildMultisigTransferTransactionRequestSchema = {
  type: 'object',
  required: ['network', 'contract', 'input', 'sender'],
  properties: {
    network: { $ref: 'base#/definitions/network' },
    contract: { type: 'string' },
    input: { type: 'string' },
    sender: { type: 'string' },
    params: { $ref: 'base#/definitions/params' },
  },
};

export const BuildMultisigTokenTransferInputRequestSchema = {
  type: 'object',
  required: ['tokenAddress', 'toAddress', 'quantity', 'expireTime', 'sequenceId'],
  properties: {
    tokenAddress: { type: 'string' },
    toAddress: { type: 'string' },
    quantity: { type: 'string' },
    expireTime: { type: 'integer' },
    sequenceId: { type: 'integer' },
  },
};

export const SignMultisigTokenTransferInputRequestSchema = {
  type: 'object',
  required: ['serialized', 'signatures'],
  properties: {
    serialized: { type: 'string' },
    signatures: { type: 'array', items: { $ref: 'base#/definitions/signature' } },
  },
};

export const BuildMultisigTokenTransferTransactionRequestSchema = {
  type: 'object',
  required: ['serialized', 'contract', 'input', 'sender'],
  properties: {
    serialized: { type: 'string' },
    contract: { type: 'string' },
    input: { type: 'string' },
    sender: { type: 'string' },
    params: { type: 'array', items: { $ref: 'base#/definitions/params' } },
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
