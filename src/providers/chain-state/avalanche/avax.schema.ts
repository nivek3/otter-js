export const AvalancheRefSchema = {
  $id: 'base',
  definitions: {
    network: {
      type: 'object',
      required: ['networkId'],
      properties: {
        networkId: { type: 'number' },
      },
    },
    utxo: {
      type: 'object',
      required: ['addresses'],
      properties: {
        vout: { type: 'integer' },
        txid: { type: 'string' },
        amount: { type: 'string' },
        utxo: { type: 'string' },
        addresses: { type: 'array', uniqueItems: true, items: { type: 'string' } },
      },
    },
    recipient: {
      type: 'object',
      properties: {
        addresses: { type: 'array', uniqueItems: true, items: { type: 'string' } },
        amount: { type: 'string' },
      },
    },
    params: {
      type: 'object',
      properties: {
        fee: { type: 'string' },
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
    network: { type: 'object', $ref: 'base#/definitions/network' },
  },
};

export const BuildAVAXTransferTransactionSchema = {
  type: 'object',
  required: ['network', 'utxos', 'recipients'],
  properties: {
    network: { type: 'object', $ref: 'base#/definitions/network' },
    params: { type: 'object', $ref: 'base#/definitions/params' },
    utxos: { type: 'array', uniqueItems: true, items: { type: 'object', $ref: 'base#/definitions/utxo' } },
    recipients: {
      type: 'array',
      uniqueItems: true,
      items: { type: 'object', $ref: 'base#/definitions/recipient', required: ['addresses', 'amount'] },
    },
    change: { type: 'object', $ref: 'base#/definitions/recipient', required: ['addresses'] },
  },
};

export const HashForSignatureRequestSchema = {
  type: 'object',
  required: ['network', 'serialized', 'utxos'],
  properties: {
    network: { type: 'object', $ref: 'base#/definitions/network' },
    serialized: { type: 'string' },
    utxos: { type: 'array', uniqueItems: true, items: { type: 'object', $ref: 'base#/definitions/utxo' } },
  },
};

export const SignTransactionRequestSchema = {
  type: 'object',
  required: ['network', 'serialized', 'signatures'],
  properties: {
    network: { type: 'object', $ref: 'base#/definitions/network', required: ['networkId'] },
    serialized: { type: 'string' },
    signatures: { type: 'array', items: { type: 'object', $ref: 'base#/definitions/signature' } },
  },
};

export const SendTransactionRequestSchema = {
  type: 'object',
  required: ['network', 'serialized'],
  properties: {
    network: { type: 'object', $ref: 'base#/definitions/network', required: ['networkId', 'provider'] },
    serialized: { type: 'string' },
  },
};

export const DecodeTransactionRequestSchema = {
  type: 'object',
  required: ['network', 'serialized'],
  properties: {
    network: { type: 'object', $ref: 'base#/definitions/network', required: ['networkId'] },
    serialized: { type: 'string' },
  },
};
