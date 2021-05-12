export interface ConfigType {
  maxPoolSize: number;
  port: number;
  numWorkers: number;

  chains: {
    [currency: string]: { [network: string]: any };
  };
  services: {
    api: {
      disabled?: boolean;
      rateLimiter?: {
        disabled?: boolean;
        whitelist: string[];
      };
    };
  };
}