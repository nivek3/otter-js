import { ConfigType } from '../types/Config';
import config from '../config';
import { valueOrDefault } from '../utils/check';

type RecursivePartial<T> = { [P in keyof T]?: RecursivePartial<T[P]> };
type ServiceName = keyof ConfigType['services'];

export class ConfigService {
  _config: ConfigType;

  constructor({ _config = config } = {}) {
    this._config = _config;
  }

  public get() {
    return this._config;
  }

  public updateConfig(partialConfig: RecursivePartial<ConfigType>) {
    const newConfig = Object.assign({}, this.get(), partialConfig);
    this._config = newConfig;
  }

  public for<T extends keyof ConfigType['services']>(service: T): ConfigType['services'][T] {
    return this.get().services[service] || {};
  }

  public isDisabled(service: ServiceName) {
    const serviceConfig = this.for(service);
    const isDefined = x => x !== undefined;
    const disabled = isDefined(serviceConfig) ? valueOrDefault(serviceConfig.disabled, false) : false;
    return disabled;
  }
}

export const Config = new ConfigService();