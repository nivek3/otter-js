import { homedir, cpus } from 'os';
import parseArgv from './utils/parseArgv';
import { ConfigType } from './types/Config';
import * as _ from 'lodash';
let program = parseArgv([], ['config']);

function findConfig(): ConfigType | undefined {
  let foundConfig;
  const envConfigPath = process.env.BITCORE_CONFIG_PATH;
  const argConfigPath = program.config;
  const configFileName = 'node.config.json';
  let bitcoreConfigPaths = [
    `../../${configFileName}`,
    `${homedir()}/${configFileName}`
  ];
  const overrideConfig = argConfigPath || envConfigPath;
  if (overrideConfig) {
    bitcoreConfigPaths.unshift(overrideConfig);
  }
  // No config specified. Search home, bitcore and cur directory
  for (let path of bitcoreConfigPaths) {
    if (!foundConfig) {
      try {
        const expanded = path[0] === '~' ? path.replace('~', homedir()) : path;
        const bitcoreConfig = require(expanded) as { bitcoreNode: ConfigType };
        foundConfig = bitcoreConfig.bitcoreNode;
      } catch (e) {
        foundConfig = undefined;
      }
    }
  }
  return foundConfig;
}

function setTrustedPeers(config: ConfigType): ConfigType {
  for (let [chain, chainObj] of Object.entries(config)) {
    for (let network of Object.keys(chainObj)) {
      let env = process.env;
      const envString = `TRUSTED_${chain.toUpperCase()}_${network.toUpperCase()}_PEER`;
      if (env[envString]) {
        let peers = config.chains[chain][network].trustedPeers || [];
        peers.push({
          host: env[envString],
          port: env[`${envString}_PORT`]
        });
        config.chains[chain][network].trustedPeers = peers;
      }
    }
  }
  return config;
}
const Config = function(): ConfigType {
  let config: ConfigType = {
    maxPoolSize: 50,
    port: 3000,
    numWorkers: true ? 1 : cpus().length,
    chains: {},
    services: {
      api: {
        rateLimiter: {
          disabled: false,
          whitelist: ['::ffff:127.0.0.1', '::1']
        }
      }
    }
  };

  let foundConfig = findConfig();
  const mergeCopyArray = (objVal, srcVal) => (objVal instanceof Array ? srcVal : undefined);
  config = _.mergeWith(config, foundConfig, mergeCopyArray);
  if (!Object.keys(config.chains).length) {
    Object.assign(config.chains, {
      BTC: {
        mainnet: {
          chainSource: 'p2p',
          trustedPeers: [{ host: '127.0.0.1', port: 8333 }],
          rpc: {
            host: '127.0.0.1',
            port: 8332,
            username: 'bitcoin',
            password: 'bitcoin'
          }
        }
      }
    });
  }
  config = setTrustedPeers(config);

  Object.keys(config.chains).forEach(chain => {
    if (config.chains[chain].parentChain) {
      config.chains[chain] = {...config.chains[config.chains[chain].parentChain] , ...config.chains[chain]}
    }
  });

  return config;
};

export default Config();