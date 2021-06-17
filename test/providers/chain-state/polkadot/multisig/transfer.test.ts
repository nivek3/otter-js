import { ApiPromise, WsProvider } from '@polkadot/api';
import { transfer } from '../../../../../src/providers/chain-state/polkadot/multisig/transfer';
import { disconnect, setupConnection } from '../setup';

let api: ApiPromise;
beforeAll(async () => {
  api = await setupConnection();
});

afterAll(async () => {
  await disconnect();
});

describe('ChainStateProvider Polkadot', () => {
  describe('Polkadot', () => {
    test.skip('transfer', async () => {
      const req = {
        api,
        ss58Format: 42,
        addresses: [],
        threshold: 2,
        quantity: '',
        sender: '',
        nonce: 10,
        from: '',
        to: '',
      };
      const { serialized, signatureHash } = await transfer(req);
      expect(serialized).toEqual('0x65222f6881191b6640f1e2609dc4c72b8a5cb9aded400f6e7f2b6b9c2997d97b');
      expect(signatureHash).toEqual('0x07000078fa2a61b6f9ee896d847d9363417fa984e40853dd72e05f7ea12fe9db4ead05a10f');
    });
  });
});
