import 'dotenv/config';
import { getCallHexAndHash, pubKeyToBlack2Address } from '../../../../src/providers/chain-state/polkadot/utils';
import { setupConnection } from './setup';

describe('ChainStateProvider Polkadot', () => {
  describe('Polkadot utils', () => {
    test('getCallHexAndHash', async () => {
      const api = await setupConnection();
      const to = '5EoKvCTnroB1niQHqhn7hzSPYryUoByaUaogkafq1m8ZK6nL';
      const amount = '1000';
      const { callMethodHash, callMethodHex } = getCallHexAndHash(api, to, amount);
      expect(callMethodHash.toHex()).toEqual('0x65222f6881191b6640f1e2609dc4c72b8a5cb9aded400f6e7f2b6b9c2997d97b');
      expect(callMethodHex).toEqual('0x07000078fa2a61b6f9ee896d847d9363417fa984e40853dd72e05f7ea12fe9db4ead05a10f');
    });

    test('pubKeyToBlack2Address', () => {
      const pubKey = '0346219571358630cf0565dc9826f4583014a32d2230f04df77b6c2097c2e09624';
      const expected = '5HhZWYeLNRbpofy4F34vVENgwxQVE8HGWhprVE6MPPCqUdRn';
      expect(expected).toEqual(pubKeyToBlack2Address(pubKey));

      expect(expected).toEqual(pubKeyToBlack2Address('0x' + pubKey, 42));
    });
  });
});
