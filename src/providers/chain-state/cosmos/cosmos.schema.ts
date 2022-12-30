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
      properties: {
        amount: { type: 'object', $ref: '#/definitions/amount' },
        gas: { type: 'string' },
        gasPrice: { type: 'string' },
      },
      oneOf: [
        {
          required: ['amount', 'gas'],
        },
        {
          required: ['gasPrice'],
        },
      ],
    },
    params: {
      type: 'object',
      properties: {
        fee: { type: 'object', $ref: '#/definitions/fee' },
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
    network: { type: 'object', $ref: 'base#/definitions/network', required: ['bech32Prefix'] },
  },
};

export const DeployMultisigAccountRequestSchema = {
  type: 'object',
  required: ['pubKeys', 'network', 'threshold'],
  properties: {
    network: { type: 'object', $ref: 'base#/definitions/network', required: ['bech32Prefix'] },
    pubKeys: { type: 'array', uniqueItems: true, items: { type: 'string' } },
    threshold: { type: 'integer' },
  },
};

export const BuildTransferTransactionRequestSchema = {
  type: 'object',
  required: ['from', 'to', 'amount', 'params', 'pubKey'],
  properties: {
    network: { type: 'object', $ref: 'base#/definitions/network' },
    params: { type: 'object', $ref: 'base#/definitions/params', required: ['fee'] },
    amount: { type: 'object', $ref: 'base#/definitions/amount' },
    pubKey: { type: 'string' },
    from: { type: 'string' },
    to: { type: 'string' },
  },
};

export const SignTransactionRequestSchema = {
  type: 'object',
  required: ['serialized', 'signatures'],
  properties: {
    serialized: { type: 'string' },
    signatures: { type: 'array', items: { type: 'object', $ref: 'base#/definitions/signature' } },
  },
};

export const SendTransactionRequestSchema = {
  type: 'object',
  required: ['serialized', 'network'],
  properties: {
    network: { type: 'object', $ref: 'base#/definitions/network', required: ['provider'] },
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
  required: ['network', 'serialized', 'params', 'from', 'pubKey'],
  properties: {
    network: { type: 'object', $ref: 'base#/definitions/network', required: ['chainId'] },
    serialized: { type: 'string' },
    from: { type: 'string' },
    pubKey: { type: 'string' },
    params: {
      type: 'object',
      $ref: 'base#/definitions/params',
      properties: {
        fee: { type: 'object', $ref: 'base#/definitions/params', required: ['gas'] },
      },
    },
  },
};

export const BuildMultisigTransferTransactionRequestSchema = {
  type: 'object',
  required: ['from', 'to', 'amount', 'params', 'pubKeys', 'threshold'],
  properties: {
    network: { type: 'object', $ref: 'base#/definitions/network' },
    params: { type: 'object', $ref: 'base#/definitions/params', required: ['fee'] },
    amount: { type: 'object', $ref: 'base#/definitions/amount' },
    from: { type: 'string' },
    to: { type: 'string' },
    pubKeys: { type: 'array', uniqueItems: true, items: { type: 'string' } },
    threshold: { type: 'integer' },
  },
};

export const SignMultisigTransactionRequestSchema = {
  type: 'object',
  required: ['serialized', 'signatures', 'threshold'],
  properties: {
    threshold: { type: 'integer' },
    pubKeys: { type: 'array', uniqueItems: true, items: { type: 'string' } },
    serialized: { type: 'string' },
    signatures: {
      type: 'array',
      items: { type: 'object', $ref: 'base#/definitions/signature', required: ['signature', 'pubKey', 'hash'] },
    },
  },
};

export const BuildDelegateTransactionRequestSchema = {
  type: 'object',
  required: ['validator', 'delegator', 'amount', 'params', 'pubKey'],
  properties: {
    network: { type: 'object', $ref: 'base#/definitions/network' },
    params: { type: 'object', $ref: 'base#/definitions/params', required: ['fee'] },
    amount: { type: 'object', $ref: 'base#/definitions/amount' },
    pubKey: { type: 'string' },
    validator: { type: 'string' },
    delegator: { type: 'string' },
  },
};

export const BuildUndelegateTransactionRequestSchema = {
  type: 'object',
  required: ['validator', 'delegator', 'amount', 'params', 'pubKey'],
  properties: {
    network: { type: 'object', $ref: 'base#/definitions/network' },
    params: { type: 'object', $ref: 'base#/definitions/params', required: ['fee'] },
    amount: { type: 'object', $ref: 'base#/definitions/amount' },
    pubKey: { type: 'string' },
    validator: { type: 'string' },
    delegator: { type: 'string' },
  },
};

export const BuildRedelegateTransactionRequestSchema = {
  type: 'object',
  required: ['validatorSrcAddress', 'validatorDstAddress', 'delegator', 'amount', 'params', 'pubKey'],
  properties: {
    network: { type: 'object', $ref: 'base#/definitions/network' },
    params: { type: 'object', $ref: 'base#/definitions/params', required: ['fee'] },
    amount: { type: 'object', $ref: 'base#/definitions/amount' },
    pubKey: { type: 'string' },
    validatorSrcAddress: { type: 'string' },
    validatorDstAddress: { type: 'string' },
    delegator: { type: 'string' },
  },
};

export const BuildWithdrawDelegationRewardTransactionSchema = {
  type: 'object',
  required: ['validators', 'delegator', 'params', 'pubKey'],
  properties: {
    network: { type: 'object', $ref: 'base#/definitions/network' },
    params: { type: 'object', $ref: 'base#/definitions/params', required: ['fee'] },
    pubKey: { type: 'string' },
    validators: { type: 'array', uniqueItems: true, items: { type: 'string' } },
    delegator: { type: 'string' },
  },
};

export const BuildMultisigDelegateTransactionRequestSchema = {
  type: 'object',
  required: ['validator', 'delegator', 'amount', 'params', 'pubKeys'],
  properties: {
    network: { type: 'object', $ref: 'base#/definitions/network' },
    params: { type: 'object', $ref: 'base#/definitions/params', required: ['fee'] },
    pubKeys: { type: 'array', uniqueItems: true, items: { type: 'string' } },
    validator: { type: 'string' },
    delegator: { type: 'string' },
    amount: { type: 'object', $ref: 'base#/definitions/amount' },
  },
};

export const BuildMultisigUndelegateTransactionRequestSchema = {
  type: 'object',
  required: ['validator', 'delegator', 'amount', 'params', 'pubKeys'],
  properties: {
    network: { type: 'object', $ref: 'base#/definitions/network' },
    params: { type: 'object', $ref: 'base#/definitions/params', required: ['fee'] },
    pubKeys: { type: 'array', uniqueItems: true, items: { type: 'string' } },
    validator: { type: 'string' },
    delegator: { type: 'string' },
    amount: { type: 'object', $ref: 'base#/definitions/amount' },
  },
};

export const BuildMultisigRedelegateTransactionRequestSchema = {
  type: 'object',
  required: ['validatorSrcAddress', 'validatorDstAddress', 'delegator', 'amount', 'params', 'pubKeys'],
  properties: {
    network: { type: 'object', $ref: 'base#/definitions/network' },
    params: { type: 'object', $ref: 'base#/definitions/params', required: ['fee'] },
    pubKeys: { type: 'array', uniqueItems: true, items: { type: 'string' } },
    validatorSrcAddress: { type: 'string' },
    validatorDstAddress: { type: 'string' },
    delegator: { type: 'string' },
    amount: { type: 'object', $ref: 'base#/definitions/amount' },
  },
};

export const BuildMultisigWithdrawDelegationRewardTransactionSchema = {
  type: 'object',
  required: ['validators', 'delegator', 'params', 'pubKeys'],
  properties: {
    network: { type: 'object', $ref: 'base#/definitions/network' },
    params: { type: 'object', $ref: 'base#/definitions/params', required: ['fee'] },
    pubKeys: { type: 'array', uniqueItems: true, items: { type: 'string' } },
    validators: { type: 'array', uniqueItems: true, items: { type: 'string' } },
    delegator: { type: 'string' },
  },
};
