import { ChainNetwork } from "../ChainNetwork";

export declare namespace CSP {
  export type DeployAccountParams = {
    keys: Array<string>;
    requiredConfirmations: number;
  }
  export type RequestParams = {
    payload: any;
    network: ChainNetwork & any;
  }
  export type Provider<T> = { get(params: { platform: string }): T };
  export type ChainStateProvider = Provider<IChainStateService> & IChainStateService;
  export interface IChainStateService {
    deployAccount(params: RequestParams): Promise<string>;
    buildTransaction(params: RequestParams): Promise<any>;
    signTransaction(params: RequestParams): Promise<any>;
  }

  type ChainStateServices = { [key: string]: IChainStateService };
}