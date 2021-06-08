import { ApiPromise, WsProvider } from '@polkadot/api';
import { getCallHexAndHash } from '../../../../../src/providers/chain-state/polkadot/utils';
import { disconnect, setupConnection } from '../setup';

let api: ApiPromise;
beforeAll(async () => {
  api = await setupConnection();
});

afterAll(async () => {
  await disconnect();
});

describe('ChainStateProvider Polkadot', () => {
  describe('Polkadot transfer', () => {
    test('getCallHexAndHash', () => {
      const to = '5EoKvCTnroB1niQHqhn7hzSPYryUoByaUaogkafq1m8ZK6nL';
      const amount = '1000';
      const { callMethodHash, callMethodHex } = getCallHexAndHash(api, to, amount);
      expect(callMethodHash.toHex()).toEqual('0x65222f6881191b6640f1e2609dc4c72b8a5cb9aded400f6e7f2b6b9c2997d97b');
      expect(callMethodHex).toEqual('0x07000078fa2a61b6f9ee896d847d9363417fa984e40853dd72e05f7ea12fe9db4ead05a10f');
    });
  });
});
