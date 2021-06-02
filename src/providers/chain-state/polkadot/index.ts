import { ApiPromise, WsProvider } from '@polkadot/api';
import BigNumber from 'bignumber.js';
import { encodeMultiAddress } from '@polkadot/util-crypto';
import { transfer } from './multisig/transfer';
import { sign } from './multisig/sign';
import { CSP } from '../../../types/namespaces/ChainStateProvider';

export class PolkaDotStateProvider implements CSP.IChainStateService {
  deployAccount(params: CSP.RequestParams): string {
    const { keys, requiredConfirmations } = params.payload;
    const { ss58Format } = params.network.params;
    return encodeMultiAddress(keys, requiredConfirmations, ss58Format);
  }

  async buildTransaction(params: CSP.RequestParams): Promise<any> {
    const { type, data, extra } = params.payload;
    const { wss, ss58PREFIX } = params.network.params;
    if (type != 'transfer') throw 'Unsupported transaction types';
    const api: ApiPromise = await this.getApi(wss);
    const { from, to, quantity } = data;
    const { addresses, signer, threshold, decimals } = extra;
    const { nonce } = await api.query.system.account(signer);

    const { serialized, signatureHash } = await transfer({
      api,
      ss58PREFIX,
      addresses,
      threshold,
      quantity,
      decimals,
      sender: signer,
      nonce: nonce.toNumber(),
      from,
      to,
      maxWeight: 50,
    });

    return {
      serialized: serialized.slice(2),
      signatureHash,
    };
  }

  async signTransaction(params: CSP.RequestParams): Promise<any> {
    const { serialized, signature } = params.payload;
    const { wss } = params.network.params;
    const api: ApiPromise = await this.getApi(wss);

    const hex = sign({ api, serialized, signature });
    const extrinsic = api.createType('Extrinsic', hex);

    return {
      serialized: extrinsic.toHex(),
      hashForSignature: '',
    };
  }

  async getApi(wss: string, autoConnectMs = 1000 * 60) {
    const cloverTypes = require('@clover-network/node-types');
    const wsProvider = new WsProvider(wss, autoConnectMs);
    return await ApiPromise.create({
      provider: wsProvider,
      types: cloverTypes,
    });
  }
}
