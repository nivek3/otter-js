import 'dotenv/config';
import { polkaDotStateProvider } from '../../../../src/providers/chain-state/polkadot';

describe('ChainStateProvider Polkadot', () => {
  describe('Polkadot provider', () => {
    test('deployAccount', async () => {
      const req = {
        keys: [
          '0x026970416978b59b81347a6764e2891d5f1894cb3c7f03874d77bcd65e8c3f8613',
          '0x020c0ad3825f41eda2c533659a8ce891c0e4fd78e8f1c753fa85992fdfd38236bd',
          '0x02e01213d5ded33b3a139993ef01e7f3fb286cac04595726441d59b25e15750713',
        ],
        threshold: 2,
        network: {
          wss: 'wss://api.clover.finance',
          ss58Format: 42,
        },
      };
      const addresses = polkaDotStateProvider.deployMultisigAccount(req);
      expect(addresses).toEqual('5EjXLmCHWyo5SVTQEo9JBgozVNZgWYheAdENAuEZ1UvaGD3e');
    });
  });
});
