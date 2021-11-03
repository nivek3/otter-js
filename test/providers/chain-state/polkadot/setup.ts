import 'dotenv/config';
import cloverTypes from '@clover-network/node-types';
import { ApiPromise, WsProvider } from '@polkadot/api';
// Cached API connection
let api: ApiPromise | undefined;

export async function setupConnection(): Promise<ApiPromise> {
  try {
    if (!api) {
      const provider = new WsProvider(process.env.WSS_PROVIDER);
      // Init the server
      api = await ApiPromise.create({
        types: cloverTypes,
        provider,
      });
      return api;
    } else {
      return api;
    }
  } catch (error: any) {
    throw new Error(error.message);
  }
}

/**
 * Close the api connection, disconnect
 */
export async function disconnect(): Promise<void> {
  if (api && api.isConnected) {
    // https://github.com/polkadot-js/api/issues/3428#issuecomment-825562189
    // await api?.disconnect();
  }
}
