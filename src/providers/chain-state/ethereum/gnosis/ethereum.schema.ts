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
    transaction: {
      type: 'object',
      minProperties: 2,
      properties: {
        to: { type: 'string' },
        data: { type: 'string' },
        operation: { type: 'integer' },
        value: { type: 'string' },
      },
    },
  },
};

export const GetAccountRequestSchema = {
  type: 'object',
  required: ['network', 'threshold', 'keys', 'saltNonce'],
  properties: {
    network: { $ref: 'base#/definitions/network' },
    threshold: { type: 'integer', minimum: 1 },
    keys: { type: 'array', uniqueItems: true, items: { type: 'string' } },
    saltNonce: { type: ['integer', 'string'], minimum: 0 },
  },
};

export const BuildAccountTransactionRequestSchema = {
  type: 'object',
  required: ['network', 'threshold', 'keys', 'sender'],
  properties: {
    network: { $ref: 'base#/definitions/network' },
    keys: { type: 'array', uniqueItems: true, items: { type: 'string' } },
    threshold: { type: 'integer', minimum: 1 },
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

export const BuildTransferInputRequestSchema = {
  type: 'object',
  required: ['toAddress', 'value', 'contract', 'participants'],
  properties: {
    toAddress: { type: 'string' },
    value: { type: 'string' },
    contract: { type: 'string' },
    contractNonce: { type: 'integer' },
    participants: { type: 'array', uniqueItems: true, items: { type: 'string' } },
    sender: { type: 'string' },
  },
};

export const BuildInputRequestSchema = {
  type: 'object',
  required: ['to', 'contract', 'participants'],
  properties: {
    to: { type: 'string' },
    data: { type: 'string' },
    quantity: { type: 'string' },
    contract: { type: 'string' },
    contractNonce: { type: 'integer' },
    participants: { type: 'array', uniqueItems: true, items: { type: 'string' } },
    sender: { type: 'string' },
  },
};

export const SignInputRequestSchema = {
  type: 'object',
  required: ['serialized', 'signatures'],
  properties: {
    serialized: { type: 'string' },
    signatures: { type: 'array', items: { $ref: 'base#/definitions/signature', type: 'object', required: ['pubKey', 'signature'] } },
  },
};

export const BuildTransactionRequestSchema = {
  type: 'object',
  required: ['network', 'contract', 'data'],
  properties: {
    network: { $ref: 'base#/definitions/network' },
    contract: { type: 'string' },
    data: { type: 'string' },
    params: { $ref: 'base#/definitions/params' },
  },
};

export const BuildERC20TransferInputRequestSchema = {
  type: 'object',
  required: ['network', 'contract', 'tokenAddress', 'toAddress', 'quantity'],
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

export const BuildMultiSendInputRequestSchema = {
  type: 'object',
  required: ['network', 'contract', 'txs', 'participants'],
  properties: {
    network: { $ref: 'base#/definitions/network' },
    contract: { type: 'string' },
    contractNonce: { type: 'integer' },
    value: { type: 'string' },
    toAddress: { type: 'string' },
    txs: { type: 'array', items: { $ref: 'base#/definitions/transaction', type: 'object' } },
    participants: { type: 'array', uniqueItems: true, items: { type: 'string' } },
    sender: { type: 'string' },
  },
};

export const BuildAddOwnerWithThresholdInputRequestSchema = {
  type: 'object',
  required: ['network', 'contract', 'threshold', 'owner'],
  properties: {
    network: { $ref: 'base#/definitions/network' },
    contract: { type: 'string' },
    contractNonce: { type: 'integer' },
    owner: { type: 'string' },
    threshold: { type: 'integer' },
    participants: { type: 'array', uniqueItems: true, items: { type: 'string' } },
    sender: { type: 'string' },
  },
};

export const BuildChangeThresholdInputRequestSchema = {
  type: 'object',
  required: ['network', 'contract', 'threshold'],
  properties: {
    network: { $ref: 'base#/definitions/network' },
    contract: { type: 'string' },
    contractNonce: { type: 'integer' },
    threshold: { type: 'integer' },
    participants: { type: 'array', uniqueItems: true, items: { type: 'string' } },
    sender: { type: 'string' },
  },
};

export const BuildRemoveOwnerInputRequestSchema = {
  type: 'object',
  required: ['network', 'contract', 'prevOwner', 'owner'],
  properties: {
    network: { $ref: 'base#/definitions/network' },
    contract: { type: 'string' },
    contractNonce: { type: 'integer' },
    threshold: { type: 'integer' },
    prevOwner: { type: 'string' },
    owner: { type: 'string' },
    participants: { type: 'array', uniqueItems: true, items: { type: 'string' } },
    sender: { type: 'string' },
  },
};

export const BuildSwapOwnerInputRequestSchema = {
  type: 'object',
  required: ['network', 'contract', 'prevOwner', 'oldOwner', 'newOwner'],
  properties: {
    network: { $ref: 'base#/definitions/network' },
    contract: { type: 'string' },
    contractNonce: { type: 'integer' },
    threshold: { type: 'integer' },
    prevOwner: { type: 'string' },
    oldOwner: { type: 'string' },
    newOwner: { type: 'string' },
    participants: { type: 'array', uniqueItems: true, items: { type: 'string' } },
    sender: { type: 'string' },
  },
};
