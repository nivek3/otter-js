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

export const DeployAccountRequestSchema = {
  type: 'object',
  required: ['key'],
  properties: {
    key: { type: 'string' },
    network: { type: 'object', $ref: 'base#/definitions/network' },
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

export const BuildERC20TransferTransactionRequestSchema = {
  type: 'object',
  required: ['network', 'from', 'to', 'quantity', 'tokenAddress'],
  properties: {
    network: { type: 'object', $ref: 'base#/definitions/network' },
    params: { type: 'object', $ref: 'base#/definitions/params' },
    from: { type: 'string' },
    to: { type: 'string' },
    quantity: { type: 'string' },
  },
};

export const SignTransactionRequestSchema = {
  type: 'object',
  required: ['network', 'serialized', 'signatures'],
  properties: {
    network: { type: 'object', $ref: 'base#/definitions/network' },
    serialized: { type: 'string' },
    signatures: { type: 'array', items: { type: 'object', $ref: 'base#/definitions/signature', required: ['signature'] } },
  },
};

export const SendTransactionRequestSchema = {
  type: 'object',
  required: ['network', 'serialized'],
  properties: {
    network: { type: 'object', $ref: 'base#/definitions/network' },
    serialized: { type: 'string' },
  },
};

export const BuildTransactionRequestSchema = {
  type: 'object',
  anyOf: [
    { required: ['network', 'from', 'to', 'value'] },
    { required: ['network', 'from', 'data'] }, // contract creation
    { required: ['network', 'from', 'to', 'data'] }, // contract execution
  ],
  properties: {
    network: { type: 'object', $ref: 'base#/definitions/network' },
    params: { type: 'object', $ref: 'base#/definitions/params' },
    from: { type: 'string' },
    to: { type: 'string' },
    value: { type: 'string' },
    data: { type: 'string' },
  },
};

export const RebuildTransactionRequestSchema = {
  type: 'object',
  required: ['network', 'serialized'],
  properties: {
    network: { type: 'object', $ref: 'base#/definitions/network' },
    params: { type: 'object', $ref: 'base#/definitions/params' },
    serialized: { type: 'string' },
  },
};

export const HashForSignatureRequestSchema = {
  type: 'object',
  required: ['network', 'serialized'],
  properties: {
    network: { type: 'object', $ref: 'base#/definitions/network' },
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

export const BuildContractCreationTransactionInputRequestSchema = {
  type: 'object',
  required: ['abi', 'bytecode', 'args'],
  properties: {
    network: { type: 'object', $ref: 'base#/definitions/network' },
    abi: { type: 'array', uniqueItems: true, items: { type: 'string' } },
    bytecode: { type: 'string' },
    args: { type: 'string' },
  },
};

export const BuildContractExecutionTransactionInputRequestSchema = {
  type: 'object',
  required: ['abi', 'method', 'args'],
  properties: {
    network: { type: 'object', $ref: 'base#/definitions/network' },
    contractAddress: { type: 'string' },
    abi: { type: 'array', uniqueItems: true, items: { type: 'string' } },
    method: { type: 'string' },
    args: { type: 'string' },
  },
};

export const BuildContractTransactionRequestSchema = {
  type: 'object',
  required: ['network', 'from', 'contractAddress', 'abi', 'method'],
  properties: {
    network: { type: 'object', $ref: 'base#/definitions/network' },
    from: { type: 'string' },
    contractAddress: { type: 'string' },
    abi: { type: 'array', uniqueItems: true, items: { type: 'string' } },
    method: { type: 'string' },
    args: { type: 'string' },
  },
};

export const GetFeeDataRequestSchema = {
  type: 'object',
  required: ['network'],
  properties: {
    network: { type: 'object', $ref: 'base#/definitions/network', required: ['provider', 'chainId'] },
  },
};
