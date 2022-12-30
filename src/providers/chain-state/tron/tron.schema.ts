export const TronRefSchema = {
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
        note: { type: 'string' },
        permissionId: { type: 'string' },
        feeLimit: { type: 'integer' },
        callValue: { type: 'integer' },
        extension: { type: 'integer' },
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

export const BuildTransferTransactionSchema = {
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

export const BuildTRC10TransferTransactionSchema = {
  type: 'object',
  required: ['network', 'from', 'to', 'quantity', 'tokenId'],
  properties: {
    network: { type: 'object', $ref: 'base#/definitions/network' },
    params: { type: 'object', $ref: 'base#/definitions/params' },
    from: { type: 'string' },
    to: { type: 'string' },
    quantity: { type: 'string' },
    tokenId: { type: 'string' },
  },
};

export const BuildTRC20TransferTransactionSchema = {
  type: 'object',
  required: ['network', 'from', 'to', 'quantity', 'contract'],
  properties: {
    network: { type: 'object', $ref: 'base#/definitions/network' },
    params: { type: 'object', $ref: 'base#/definitions/params' },
    from: { type: 'string' },
    to: { type: 'string' },
    quantity: { type: 'string' },
    contract: { type: 'string' },
  },
};

export const SignTransactionRequestSchema = {
  type: 'object',
  required: ['network', 'serialized', 'signatures'],
  properties: {
    network: { type: 'object', $ref: 'base#/definitions/network' },
    serialized: { type: 'string' },
    signatures: { type: 'array', items: { $ref: 'base#/definitions/signature', type: 'object', required: ['signature'] } },
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

export const DecodeTransactionRequestSchema = {
  type: 'object',
  required: ['serialized'],
  properties: {
    network: { type: 'object', $ref: 'base#/definitions/network' },
    serialized: { type: 'string' },
  },
};

export const RebuildTransactionRequestSchema = {
  type: 'object',
  required: ['serialized'],
  properties: {
    network: { type: 'object', $ref: 'base#/definitions/network' },
    params: { type: 'object', $ref: 'base#/definitions/params' },
    serialized: { type: 'string' },
  },
};
