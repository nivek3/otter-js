import { ApiPromise, WsProvider } from '@polkadot/api';
import { encodeMultiAddress } from '@polkadot/util-crypto';
import { sign } from './multisig/sign';
import { getMethod } from './method';
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
    const api: ApiPromise = await this.getApi(wss);
    const method = getMethod(type);

    if (!method) throw new Error(`Unsupported transaction types ${type}`);

    const { from, to, quantity } = data;
    const { addresses, signer, threshold, decimals, maxWeight = 50 } = extra;
    const { nonce } = await api.query.system.account(signer);

    const { serialized, signatureHash } = await method({
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
      maxWeight,
    });

    return {
      serialized,
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
