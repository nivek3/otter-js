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
        nonce: { type: 'string' },
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

export const BuildAccountTransactionRequestSchema = {
  type: 'object',
  required: ['network', 'keys', 'sender'],
  properties: {
    network: { type: 'object', $ref: 'base#/definitions/network' },
    params: { type: 'object', $ref: 'base#/definitions/params' },
    keys: { type: 'array', uniqueItems: true, items: { type: 'string' } },
    sender: { type: 'string' },
  },
};

export const BuildMultisigTransferInputRequestSchema = {
  type: 'object',
  required: ['toAddress', 'value'],
  properties: {
    toAddress: { type: 'string' },
    value: { type: 'string' },
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
    signatures: { type: 'array', items: { $ref: 'base#/definitions/signature', type: 'object', required: ['signature'] } },
  },
};

export const BuildMultisigTransferTransactionRequestSchema = {
  type: 'object',
  required: ['network', 'contract', 'sender'],
  properties: {
    network: { type: 'object', $ref: 'base#/definitions/network' },
    params: { type: 'object', $ref: 'base#/definitions/params' },
    contract: { type: 'string' },
    input: { type: 'string' },
    sender: { type: 'string' },
  },
};

export const BuildMultisigERC20TransferInputRequestSchema = {
  type: 'object',
  required: ['tokenAddress', 'toAddress', 'quantity'],
  properties: {
    tokenAddress: { type: 'string' },
    toAddress: { type: 'string' },
    quantity: { type: 'string' },
    expireTime: { type: 'integer' },
    sequenceId: { type: 'integer' },
  },
};

export const SignMultisigERC20TransferInputRequestSchema = {
  type: 'object',
  required: ['serialized', 'signatures'],
  properties: {
    serialized: { type: 'string' },
    signatures: { type: 'array', items: { $ref: 'base#/definitions/signature', type: 'object', required: ['signature'] } },
  },
};
