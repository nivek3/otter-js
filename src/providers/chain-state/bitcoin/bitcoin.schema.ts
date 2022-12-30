export const BitCoinRefSchema = {
  $id: 'base',
  definitions: {
    network: {
      type: 'object',
      required: ['pubKeyHash', 'scriptHash', 'coin'],
      properties: {
        pubKeyHash: { type: 'string' },
        scriptHash: { type: 'string' },
        bech32: { type: 'string' },
        coin: { type: 'string' },
        provider: { type: 'string' },
        dustLimit: { type: 'number' },
      },
    },
    utxo: {
      type: 'object',
      required: ['txid'],
      properties: {
        vout: { type: 'integer' },
        txid: { type: 'string' },
        scriptPubKey: { type: 'string' },
        redeemScript: { type: 'string' },
        witnessScript: { type: 'string' },
        amount: { type: 'string' },
        signers: { type: 'array', items: { type: 'string' } },
      },
    },

    recipient: {
      type: 'object',
      required: ['address', 'value'],
      properties: {
        value: { type: 'string' },
        address: { type: 'string' },
      },
    },
    params: {
      type: 'object',
      properties: {
        feeRate: { type: 'string' },
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

export const DeployMultisigAccountRequestSchema = {
  type: 'object',
  required: ['network', 'keys', 'threshold'],
  properties: {
    network: { type: 'object', $ref: 'base#/definitions/network' },
    keys: { type: 'array', uniqueItems: true, items: { type: 'string' } },
    threshold: { type: 'integer' },
  },
};

export const BuildTransactionRequestSchema = {
  type: 'object',
  anyOf: [
    {
      required: ['network', 'utxos', 'recipients'],
    },
    {
      required: ['network', 'utxos', 'changer'],
    },
  ],
  properties: {
    network: { type: 'object', $ref: 'base#/definitions/network' },
    params: { type: 'object', $ref: 'base#/definitions/params' },
    changer: { type: 'string' },
    recipients: { type: 'array', uniqueItems: true, items: { type: 'object', $ref: 'base#/definitions/recipient' } },
    utxos: { type: 'array', uniqueItems: true, items: { type: 'object', $ref: 'base#/definitions/utxo' } },
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
  required: ['network', 'serialized', 'utxos'],
  properties: {
    network: { type: 'object', $ref: 'base#/definitions/network' },
    serialized: { type: 'string' },
    signatures: {
      type: 'array',
      items: { type: 'object', $ref: 'base#/definitions/signature', required: ['signature', 'pubKey', 'hash'] },
    },
    utxos: { type: 'array', uniqueItems: true, items: { type: 'object', $ref: 'base#/definitions/utxo' } },
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

export const DecodeRawTransactionRequestSchema = {
  type: 'object',
  required: ['network', 'serialized'],
  properties: {
    network: { type: 'object', $ref: 'base#/definitions/network' },
    serialized: { type: 'string' },
  },
};
