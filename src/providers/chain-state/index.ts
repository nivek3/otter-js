import { CSP } from '../../types/namespaces/ChainStateProvider';
import { ChainNetwork } from '../../types/ChainNetwork';
import { BitcoinStateProvider } from './bitcoin/bitcoin';
import { EthereumStateProvider } from './ethereum/ethereum';
import { PolkaDotStateProvider } from './polkadot';

const services: CSP.ChainStateServices = {
  // bitcoin: new BitcoinStateProvider(),
  ethereum: new EthereumStateProvider(),
  // polkadot: new PolkaDotStateProvider(),
};

class ChainStateProxy implements CSP.ChainStateProvider {
  get({ platform }: ChainNetwork) {
    if (services[platform] == undefined) {
      throw new Error(`Chain ${platform} doesn't have a ChainStateProvider registered`);
    }
    return services[platform];
  }

  async deployAccount(params: CSP.RequestParams) {
    return this.get(params.network).deployAccount(params);
  }

  async buildTransaction(params: CSP.RequestParams) {
    return this.get(params.network).buildTransaction(params);
  }

  async signTransaction(params: CSP.RequestParams) {
    return this.get(params.network).signTransaction(params);
  }
}

export let ChainStateProvider = new ChainStateProxy();
