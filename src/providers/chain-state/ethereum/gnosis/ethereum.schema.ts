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

export const BuildAccountTransactionRequestSchema = {
  type: 'object',
  required: ['network', 'threshold', 'keys', 'sender'],
  properties: {
    network: { $ref: 'base#/definitions/network' },
    keys: { type: 'array', uniqueItems: true, items: { type: 'string' } },
    saltNonce: { type: ['integer', 'string'], minimum: 0 },
    sender: { type: 'string' },
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

export const BuildMultisigTransferInputRequestSchema = {
  type: 'object',
  required: ['toAddress', 'quantity', 'contract', 'participants', 'sender'],
  properties: {
    toAddress: { type: 'string' },
    quantity: { type: 'string' },
    contract: { type: 'string' },
    contractNonce: { type: 'integer' },
    participants: { type: 'array', uniqueItems: true, items: { type: 'string' } },
    sender: { type: 'string' },
  },
};

export const SignMultisigTransferInputRequestSchema = {
  type: 'object',
  required: ['serialized', 'signatures'],
  properties: {
    serialized: { type: 'string' },
    signatures: { type: 'array', items: { $ref: 'base#/definitions/signature', type: 'object', required: ['pubKey', 'signature'] } },
  },
};

export const BuildMultisigTransferTransactionRequestSchema = {
  type: 'object',
  required: ['network', 'contract', 'sender'],
  properties: {
    network: { $ref: 'base#/definitions/network' },
    contract: { type: 'string' },
    input: { type: 'string' },
    sender: { type: 'string' },
    params: { $ref: 'base#/definitions/params' },
  },
};

export const BuildMultisigERC20TransferInputRequestSchema = {
  type: 'object',
  required: ['network', 'contract', 'tokenAddress', 'toAddress', 'quantity', 'sender'],
  properties: {
    network: { $ref: 'base#/definitions/network' },
    contract: { type: 'string' },
    contractNonce: { type: 'integer' },
    tokenAddress: { type: 'string' },
    toAddress: { type: 'string' },
    quantity: { type: 'string' },
    sender: { type: 'string' },
  },
};

export const SignMultisigERC20TransferInputRequestSchema = {
  type: 'object',
  required: ['serialized', 'signatures'],
  properties: {
    serialized: { type: 'string' },
    signatures: { type: 'array', items: { $ref: 'base#/definitions/signature', type: 'object', required: ['pubKey', 'signature'] } },
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
