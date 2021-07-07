import 'dotenv/config';
import path from 'path';
import { promisify } from 'util';

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { grpcServer } from '../../../src/services/grpc';
import { provider } from '../../../src/providers/chain-state/polkadot';

const PROTO_PATH = path.join(__dirname, '../../../proto/polkadot.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  longs: String,
  defaults: false,
  oneofs: true,
});
const Polkadot = (grpc.loadPackageDefinition(packageDefinition) as any)?.polkadot.Polkadot;
let client;

describe('Polkadot service', () => {
  describe('DeployAccount', () => {
    beforeAll(async () => {
      await grpcServer.start();
      client = new Polkadot(`localhost:${process.env.GRPC_PORT}`, grpc.credentials.createInsecure());
    });

    afterAll(async () => {
      client?.close();
      await grpcServer.stop();
    });

    test('generate address from publicKey', async () => {
      const address = '5HhZWYeLNRbpofy4F34vVENgwxQVE8HGWhprVE6MPPCqUdRn';
      const DeployAccount = promisify(client.DeployAccount.bind(client));
      const response = await DeployAccount({
        key: '0x0346219571358630cf0565dc9826f4583014a32d2230f04df77b6c2097c2e09624',
        network: {
          provider: 'wss://api.clover.finance',
          ss58Format: 42,
        },
      });
      expect(response).toHaveProperty('address', address);
    });

    test('generate a 2-of-3 multisig P2SH address, expect valid address', async () => {
      const address = '5EjXLmCHWyo5SVTQEo9JBgozVNZgWYheAdENAuEZ1UvaGD3e';
      const DeployAccount = promisify(client.DeployMultisigAccount.bind(client));
      const response = await DeployAccount({
        keys: [
          '0x026970416978b59b81347a6764e2891d5f1894cb3c7f03874d77bcd65e8c3f8613',
          '0x020c0ad3825f41eda2c533659a8ce891c0e4fd78e8f1c753fa85992fdfd38236bd',
          '0x02e01213d5ded33b3a139993ef01e7f3fb286cac04595726441d59b25e15750713',
        ],
        threshold: 2,
        network: {
          platform: 'polkadot',
          params: {
            provider: 'wss://api.clover.finance',
            ss58Format: 42,
          },
        },
      });
      expect(response).toHaveProperty('address', address);
    });

    test('build transfer transaction', async () => {
      const BuildTransferTransaction = promisify(client.BuildTransferTransaction.bind(client));
      const response = await BuildTransferTransaction({
        to: '5Gj9zP2Rr7ZTu9RWfSZ8W62tf1kcmsoLYSeX6BqDwUHQKw7j',
        quantity: '1000',
        from: '5HhZWYeLNRbpofy4F34vVENgwxQVE8HGWhprVE6MPPCqUdRn',
        network: {
          provider: 'wss://api.clover.finance',
          ss58Format: 42,
        },
        params: {
          nonce: 4,
        },
      });
      const { method, serialized, signatureHashes } = response;
      expect(serialized).toEqual(
        '31028400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca4612020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001001000070000ce443b069ff258086572e00ab19b72728b27f810d3535eefd0bae5e4805984c8a10f',
      );
      expect(response.signatures).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            hash: '5a8e80660ee83243ac0646c63a5ab32962d43eb7b030459c36aaee9990dd34d4',
          }),
        ]),
      );
      expect(method).toEqual('070000ce443b069ff258086572e00ab19b72728b27f810d3535eefd0bae5e4805984c8a10f');
    });

    test.skip('replace the tx signature', async () => {
      const SignTransaction = promisify(client.SignTransaction.bind(client));
      const response = await SignTransaction({
        serialized:
          '31028400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca4612020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001001000070000ce443b069ff258086572e00ab19b72728b27f810d3535eefd0bae5e4805984c8a10f',
        signatures: [
          {
            signature:
              '0732d882ebd406a8ae8b02a12b53bfb55697545bf20847b3812b61ffe9d0e0c8b614ea1da9689cc2a91a3ef4913938dc2f07307b9fc55d7704bc3785f25ff7b500',
            pubkey: '',
          },
        ],
        network: {
          provider: 'wss://api.clover.finance',
          ss58Format: 42,
        },
      });
      const { serialized } = response;
      expect(serialized).toEqual(
        '0x31028400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca4612020732d882ebd406a8ae8b02a12b53bfb55697545bf20847b3812b61ffe9d0e0c8b614ea1da9689cc2a91a3ef4913938dc2f07307b9fc55d7704bc3785f25ff7b500001000070000ce443b069ff258086572e00ab19b72728b27f810d3535eefd0bae5e4805984c8a10f',
      );
    });

    describe('multisig transaction', () => {
      test('build multisig transfer transaction', async () => {
        const wss = 'wss://api.clover.finance';
        const ss58Format = 42;
        const to = '5HhZWYeLNRbpofy4F34vVENgwxQVE8HGWhprVE6MPPCqUdRn';
        const quantity = '100000';
        const api = await provider.getApi(wss, ss58Format);

        jest.spyOn(provider, 'getApi').mockResolvedValueOnce(api);
        jest.spyOn(api.query.multisig, 'multisigs').mockResolvedValueOnce({ isSome: false } as any);

        const BuildMultisigTransaction = promisify(client.BuildMultisigTransaction.bind(client));
        const response = await BuildMultisigTransaction({
          pubKeys: [
            '0x0346219571358630cf0565dc9826f4583014a32d2230f04df77b6c2097c2e09624',
            '0x026970416978b59b81347a6764e2891d5f1894cb3c7f03874d77bcd65e8c3f8613',
            '0x020c0ad3825f41eda2c533659a8ce891c0e4fd78e8f1c753fa85992fdfd38236bd',
          ],
          to,
          quantity,
          sender: '5HhZWYeLNRbpofy4F34vVENgwxQVE8HGWhprVE6MPPCqUdRn',
          threshold: 2,
          network: {
            provider: wss,
            ss58Format,
          },
          params: {
            nonce: 45,
          },
        });
        const { serialized, signatures } = response;
        expect(serialized).toEqual(
          '55038400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca461202000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100b4001d0202000826146dc16221b108d05e7d792e27e3851d15ce1887cf62a9ccea554e43426a53821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaa00bf13d36031407d5ede1415e0e93e16606fffa0f46b70481aded73627b93465c400a0252600000000',
        );
        expect(signatures).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              hash: 'a056fc8b93c255dba1805388fc7dd5c952f2bee4e01dd5ea11e5989574dff717',
            }),
          ]),
        );
      });

      test('build multisig cancel transaction', async () => {
        const wss = 'wss://api.clover.finance';
        const ss58Format = 42;
        const api = await provider.getApi(wss, ss58Format);

        const when = { height: 1231562, index: 1 };
        jest.spyOn(provider, 'getApi').mockResolvedValueOnce(api);
        jest.spyOn(api.query.multisig, 'multisigs').mockResolvedValueOnce({
          isSome: true,
          unwrap: () => {
            return { when };
          },
        } as any);

        const MultisigCancelTransaction = promisify(client.MultisigCancelTransaction.bind(client));
        const response = await MultisigCancelTransaction({
          to: '5HhZWYeLNRbpofy4F34vVENgwxQVE8HGWhprVE6MPPCqUdRn',
          pubKeys: [
            '0x0346219571358630cf0565dc9826f4583014a32d2230f04df77b6c2097c2e09624',
            '0x026970416978b59b81347a6764e2891d5f1894cb3c7f03874d77bcd65e8c3f8613',
            '0x020c0ad3825f41eda2c533659a8ce891c0e4fd78e8f1c753fa85992fdfd38236bd',
          ],
          threshold: 2,
          quantity: '100000',
          sender: '5HhZWYeLNRbpofy4F34vVENgwxQVE8HGWhprVE6MPPCqUdRn',
          network: {
            provider: wss,
            ss58Format,
          },
          params: {
            nonce: 45,
          },
        });
        const { serialized, signatures } = response;
        expect(serialized).toEqual(
          '51038400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca461202000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100b4001d0302000826146dc16221b108d05e7d792e27e3851d15ce1887cf62a9ccea554e43426a53821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaacaca120001000000bf13d36031407d5ede1415e0e93e16606fffa0f46b70481aded73627b93465c4',
        );
        expect(signatures).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              hash: '4df1b4b9b9e94e76f6a18396da2030880ca0344fcb77b5f498a268ddeaee3c0a',
            }),
          ]),
        );
      });

      test('build multisig approve transaction', async () => {
        const to = '5HhZWYeLNRbpofy4F34vVENgwxQVE8HGWhprVE6MPPCqUdRn';
        const quantity = '100000';
        const wss = 'wss://api.clover.finance';
        const ss58Format = 42;

        const api = await provider.getApi(wss, ss58Format);
        const when = { height: 1231562, index: 1 };
        jest.spyOn(provider, 'getApi').mockResolvedValueOnce(api);
        jest.spyOn(api.query.multisig, 'multisigs').mockResolvedValueOnce({
          isSome: true,
          unwrap: () => {
            return { when };
          },
        } as any);

        const MultisigApproveTransaction = promisify(client.MultisigApproveTransaction.bind(client));
        const response = await MultisigApproveTransaction({
          to,
          quantity,
          pubKeys: [
            '0x0346219571358630cf0565dc9826f4583014a32d2230f04df77b6c2097c2e09624',
            '0x026970416978b59b81347a6764e2891d5f1894cb3c7f03874d77bcd65e8c3f8613',
            '0x020c0ad3825f41eda2c533659a8ce891c0e4fd78e8f1c753fa85992fdfd38236bd',
          ],
          threshold: 2,
          sender: '5F1GPrYp5Q32Hr3hczZXoJCTxNhuQxsBbABtSjDnVK9Fn9dZ',
          network: {
            provider: 'wss://api.clover.finance',
            ss58Format: 42,
          },
          params: {
            nonce: 1,
          },
        });
        const { serialized, signatures } = response;
        expect(serialized).toEqual(
          '99038400821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaa0200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010004001d0102000826146dc16221b108d05e7d792e27e3851d15ce1887cf62a9ccea554e43426a53f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca461201caca1200010000009c070000f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca4612821a06000000a0252600000000',
        );
        expect(signatures).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              hash: 'e42925b9d6025f0e37bc161241352f181b5b652929754967d174a6485dd168ed',
            }),
          ]),
        );
      });
    });

    describe('batch transaction', () => {
      test('batch transfer transaction', async () => {
        const BatchTransferTransaction = promisify(client.BatchTransferTransaction.bind(client));
        const response = await BatchTransferTransaction({
          recipients: [
            {
              address: '5F1GPrYp5Q32Hr3hczZXoJCTxNhuQxsBbABtSjDnVK9Fn9dZ',
              value: '10000000000000',
            },
            {
              address: '5F1GPrYp5Q32Hr3hczZXoJCTxNhuQxsBbABtSjDnVK9Fn9dZ',
              value: '20000000000000',
            },
          ],
          sender: '5HhZWYeLNRbpofy4F34vVENgwxQVE8HGWhprVE6MPPCqUdRn',
          network: {
            provider: 'wss://api.clover.finance',
            ss58Format: 42,
          },
          params: {
            nonce: 68,
          },
        });
        const { serialized, signatures } = response;
        expect(serialized).toEqual(
          'fd028400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca4612020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001001101001a0008070000821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaa0b00a0724e1809070000821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaa0b0040e59c3012',
        );
        expect(signatures).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              hash: '5b088e2d8865ea21da44da0a484934fb3b3c2b25543bfbd310fdc53b584e6627',
            }),
          ]),
        );
      });
    });
  });
});
