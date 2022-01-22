import { ApiPromise, Keyring } from '@polkadot/api';
const { u8aToHex, hexToU8a } = require('@polkadot/util');
import { transfer } from '@src/providers/chain-state/polkadot/methods/transfer';
import { sign } from '@src/providers/chain-state/polkadot/methods/sign';
import { disconnect, setupConnection } from './setup';

let api: ApiPromise;
beforeAll(async () => {
  api = await setupConnection();
});

afterAll(async () => {
  await disconnect();
});

describe('ChainStateProvider Polkadot', () => {
  describe('Polkadot', () => {
    test.skip('build transfer tx', async () => {
      const req = {
        api,
        ss58Format: 42,
        quantity: '1000',
        sender: '5HhZWYeLNRbpofy4F34vVENgwxQVE8HGWhprVE6MPPCqUdRn',
        nonce: 4,
        from: '5HhZWYeLNRbpofy4F34vVENgwxQVE8HGWhprVE6MPPCqUdRn',
        to: '5F1GPrYp5Q32Hr3hczZXoJCTxNhuQxsBbABtSjDnVK9Fn9dZ',
      };
      const { serialized, hash } = await transfer(req);
      expect(serialized).toEqual(
        '31028400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca4612020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001001000070000821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaaa10',
      );
      expect(hash).toEqual(
        '070000821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaaa10f0010001100000001000000dd97e5ad3f0015f2dc45c9467b0fd36a2b7f4b9a7bc65e8111d49d6cf19c8927dd97e5ad3f0015f2dc45c9467b0fd36a2b7f4b9a7bc65e8111d49d6cf19c8927',
      );
    });
  });

  test('sign the hash', () => {
    const serialized =
      '0x' +
      '2d028400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca46120000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001001000070000821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaaa10f';
    const hash =
      '0x' +
      '070000821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaaa10f0010001100000001000000dd97e5ad3f0015f2dc45c9467b0fd36a2b7f4b9a7bc65e8111d49d6cf19c8927dd97e5ad3f0015f2dc45c9467b0fd36a2b7f4b9a7bc65e8111d49d6cf19c8927';

    const keyring = new Keyring({ ss58Format: 42, type: 'ecdsa' });
    const PHRASE = 'pledge suit pyramid apple satisfy same sponsor search involve hello crystal grief';
    const signer = keyring.addFromUri(PHRASE + '//polkadot');

    const signature = u8aToHex(signer.sign(hexToU8a(hash), { withType: true }));

    expect(signature).toEqual(
      '0x0261d4f7fb6227b6dbc0849dce5971aca1fd8dbea153983c0ed2a87420bef4f0d75a2b27719ea540492876f4d8b204e636d13681a805ed1735af701e7e2c9b555901',
    );
  });

  test.skip('replace the placeholder with the signature', () => {
    const serialized =
      '0x' +
      '2d028400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca46120000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001001000070000821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaaa10f';
    const signature =
      '0x0261d4f7fb6227b6dbc0849dce5971aca1fd8dbea153983c0ed2a87420bef4f0d75a2b27719ea540492876f4d8b204e636d13681a805ed1735af701e7e2c9b555901';
    const expected = sign({
      api,
      serialized,
      signature,
    });
    expect(expected).toEqual(
      '0x2d028400f94926205a255a902430e9310ediae0455ed368437210c8a481bd93a43fca46120000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001001000070000821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaaa10',
    );
    // const txHash = await api.rpc.author.submitExtrinsic(expected);
  });
});
