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

    test('generate a 2-of-3 multisig address, expect valid address', async () => {
      const address = '5EjXLmCHWyo5SVTQEo9JBgozVNZgWYheAdENAuEZ1UvaGD3e';
      const DeployMultisigAccount = promisify(client.DeployMultisigAccount.bind(client));
      const response = await DeployMultisigAccount({
        keys: [
          '0x026970416978b59b81347a6764e2891d5f1894cb3c7f03874d77bcd65e8c3f8613',
          '0x020c0ad3825f41eda2c533659a8ce891c0e4fd78e8f1c753fa85992fdfd38236bd',
          '0x02e01213d5ded33b3a139993ef01e7f3fb286cac04595726441d59b25e15750713',
        ],
        threshold: 2,
        network: {
          provider: 'wss://api.clover.finance',
          ss58Format: 42,
        },
      });
      expect(response).toHaveProperty('address', address);
    });

    test(
      'build transfer transaction',
      async () => {
        const Method = promisify(client.BuildTransferTransaction.bind(client));
        const { callHex, serialized, signatures, estimatedFee } = await Method({
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
        expect(estimatedFee).toBeDefined();
        expect(serialized).toEqual(
          '31028400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca4612020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001001000070000ce443b069ff258086572e00ab19b72728b27f810d3535eefd0bae5e4805984c8a10f',
        );
        expect(signatures).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              hash: '560f2e7698a43d570fed66dcf927d6577a8fb79c7f310693ad67a79c819fa752',
            }),
          ]),
        );
        expect(callHex).toEqual('070000ce443b069ff258086572e00ab19b72728b27f810d3535eefd0bae5e4805984c8a10f');
      },
      60 * 1000,
    );
    test('replace the tx signature', async () => {
      const SignTransaction = promisify(client.SignTransaction.bind(client));
      const response = await SignTransaction({
        serialized:
          '5503840078fa2a61b6f9ee896d847d9363417fa984e40853dd72e05f7ea12fe9db4ead05000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100ad04001d020200080e5797b5449c8a6526fb5fcf1a159fbc2bbdd197405aed62a9db35d1b9946e7a84d13ae19a2723ba391eebeaf096f27be25e8c7e5c477d631537ee9b5b746d440065222f6881191b6640f1e2609dc4c72b8a5cb9aded400f6e7f2b6b9c2997d97b00a0252600000000',
        signatures: [
          {
            signature:
              'eaac3319839c99e5da70aa177c457bd2d74d86acbefef1f666348b07b53d4d7a0b407f0f6f421c0f29c550265d1ef3304e1a4a7946319132ad1a1e6c3edb638a01',
            pubkey: '',
          },
        ],
        network: {
          provider: 'wss://api.clover.finance',
          ss58Format: 42,
        },
      });
      const { serialized, hash } = response;
      expect(serialized).toEqual(
        '5503840078fa2a61b6f9ee896d847d9363417fa984e40853dd72e05f7ea12fe9db4ead05000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100ad04001d020200080e5797b5449c8a6526fb5fcf1a159fbc2bbdd197405aed62a9db35d1b9946e7a84d13ae19a2723ba391eebeaf096f27be25e8c7e5c477d631537ee9b5b746d440065222f6881191b6640f1e2609dc4c72b8a5cb9aded400f6e7f2b6b9c2997d97b00a0252600000000',
      );
      expect(hash).toEqual('14cedaedf010e4dd03c08afb0b1334b892053e8144de2d74384be1c80ad3e6af');
    });

    describe('batch transaction', () => {
      test('build batch transfer transaction', async () => {
        const BuildBatchTransferTransaction = promisify(client.BuildBatchTransferTransaction.bind(client));
        const { serialized, signatures, estimatedFee } = await BuildBatchTransferTransaction({
          network: {
            provider: 'wss://api.clover.finance',
            ss58Format: 42,
          },
          params: {
            nonce: 68,
          },
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
          signer: '5HhZWYeLNRbpofy4F34vVENgwxQVE8HGWhprVE6MPPCqUdRn',
        });
        expect(estimatedFee).toBeDefined();
        expect(serialized).toEqual(
          'fd028400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca4612020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001001101001a0008070000821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaa0b00a0724e1809070000821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaa0b0040e59c3012',
        );
        expect(signatures).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              hash: 'b806e4231786b68ec9e51eb277d7b932f5588b57d56a0e619201ea2d3348122b',
            }),
          ]),
        );
      });

      test('build batch transaction', async () => {
        const BuildBatchTransaction = promisify(client.BuildBatchTransaction.bind(client));
        const { serialized, signatures, callHex, estimatedFee } = await BuildBatchTransaction({
          network: {
            provider: 'wss://api.clover.finance',
            ss58Format: 42,
          },
          params: {
            nonce: 69,
          },
          txs: [
            '1d0202000826146dc16221b108d05e7d792e27e3851d15ce1887cf62a9ccea554e43426a53821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaa00bf13d36031407d5ede1415e0e93e16606fffa0f46b70481aded73627b93465c400a0252600000000',
            '0x1d0202000826146dc16221b108d05e7d792e27e3851d15ce1887cf62a9ccea554e43426a53821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaa00bf13d36031407d5ede1415e0e93e16606fffa0f46b70481aded73627b93465c400a0252600000000',
          ],
          signer: '5HhZWYeLNRbpofy4F34vVENgwxQVE8HGWhprVE6MPPCqUdRn',
        });
        expect(estimatedFee).toBeDefined();
        expect(callHex).toEqual(
          '1a00081d0202000826146dc16221b108d05e7d792e27e3851d15ce1887cf62a9ccea554e43426a53821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaa00bf13d36031407d5ede1415e0e93e16606fffa0f46b70481aded73627b93465c400a02526000000001d0202000826146dc16221b108d05e7d792e27e3851d15ce1887cf62a9ccea554e43426a53821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaa00bf13d36031407d5ede1415e0e93e16606fffa0f46b70481aded73627b93465c400a0252600000000',
        );
        expect(serialized).toEqual(
          '1d058400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca4612020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001001501001a00081d0202000826146dc16221b108d05e7d792e27e3851d15ce1887cf62a9ccea554e43426a53821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaa00bf13d36031407d5ede1415e0e93e16606fffa0f46b70481aded73627b93465c400a02526000000001d0202000826146dc16221b108d05e7d792e27e3851d15ce1887cf62a9ccea554e43426a53821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaa00bf13d36031407d5ede1415e0e93e16606fffa0f46b70481aded73627b93465c400a0252600000000',
        );
        expect(signatures[0].hash).toBeDefined();
        // expect(signatures).toEqual(
        //   expect.arrayContaining([
        //     expect.objectContaining({
        //       hash: 'aca22b137b6c3054aa1f92da501d497dd03f0c46acd90bd747c81ab5ede8e12c',
        //     }),
        //   ]),
        // );
      });
    });

    describe('rebuild transaction', () => {
      test('rebuild batch transfer transaction', async () => {
        const RebuildTransaction = promisify(client.RebuildTransaction.bind(client));
        const response = await RebuildTransaction({
          serialized:
            'fd028400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca4612020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001001101001a0008070000821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaa0b00a0724e1809070000821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaa0b0040e59c3012',
          params: {
            nonce: 1000,
          },
          network: {
            provider: 'wss://api.clover.finance',
            ss58Format: 42,
          },
        });
        const { serialized, signatures } = response;
        expect(serialized).toEqual(
          'fd028400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca461202000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100a10f001a0008070000821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaa0b00a0724e1809070000821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaa0b0040e59c3012',
        );
        // expect(signatures).toEqual(
        //   expect.arrayContaining([
        //     expect.objectContaining({
        //       hash: '919c6d4de45cdeda035e385ccf0abbd9ef9497717f37e4c11b204ffec828dcf1',
        //     }),
        //   ]),
        // );
      });
    });

    describe('decode transaction', () => {
      test('decode transaction', async () => {
        const DecodeTransaction = promisify(client.DecodeTransaction.bind(client));
        const response = await DecodeTransaction({
          serialized:
            'fd028400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca4612020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001001101001a0008070000821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaa0b00a0724e1809070000821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaa0b0040e59c3012',
          network: {
            provider: 'wss://api.clover.finance',
            ss58Format: 42,
          },
        });
        const { nonce } = response;
        expect(nonce).toEqual(68);
      });

      test('decode transaction', async () => {
        const DecodeTransaction = promisify(client.DecodeTransaction.bind(client));
        const response = await DecodeTransaction({
          serialized:
            'fd028400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca461202000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100a10f001a0008070000821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaa0b00a0724e1809070000821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaa0b0040e59c3012',
          network: {
            provider: 'wss://api.clover.finance',
            ss58Format: 42,
          },
        });
        const { nonce } = response;
        expect(nonce).toEqual(1000);
      });
    });

    describe('legacy account staking transactions', () => {
      // https://clover-testnet.subscan.io/extrinsic/0xe34d8df03b3e29c9764352ed03d9ccb56e298ec33fa5155780a58d4fe9a8c598
      describe('Staking bond and nominate, txid="0xe34d8df03b3e29c9764352ed03d9ccb56e298ec33fa5155780a58d4fe9a8c598"', () => {
        test('BuildStakingBondAndNominateTransaction', async () => {
          const Method = promisify(client.BuildStakingBondAndNominateTransaction.bind(client));
          const response = await Method({
            network: {
              provider: 'wss://api.clover.finance',
              ss58Format: 42,
            },
            from: '5HhZWYeLNRbpofy4F34vVENgwxQVE8HGWhprVE6MPPCqUdRn',
            controller: '5HhZWYeLNRbpofy4F34vVENgwxQVE8HGWhprVE6MPPCqUdRn',
            quantity: '100000000000000',
            targets: ['5FNQoCoibJMAyqC77og9tSbhGUtaVt51SD7GdCxmMeWxPBvX', '5CqWfdrRGdZe6bwxZMiHfdcNAVePjkUJpSh2rpKgcNWciTFP'],
            params: {
              nonce: 139,
            },
          });
          const { callHex, serialized, signatures } = response;
          expect(callHex).toEqual(
            '1a0008090000f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca46120b00407a10f35a00090508009235b080b6ca2e7b2a7af7a46ac4f677bfa394e29d83611324046c38eb14ee4900222c5fa244583b1734ceb6515916efc5e103f65b869ebec4e56b989d9dbb446e',
          );
          expect(serialized).toEqual(
            '6d038400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca4612020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001002d02001a0008090000f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca46120b00407a10f35a00090508009235b080b6ca2e7b2a7af7a46ac4f677bfa394e29d83611324046c38eb14ee4900222c5fa244583b1734ceb6515916efc5e103f65b869ebec4e56b989d9dbb446e',
          );
          expect(signatures).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                hash: '02c4c736899b39bce79b9f6e37917da01d059be8a426af4680379b9ddf8cba50',
              }),
            ]),
          );
        });

        test('SignTransaction', async () => {
          const Method = promisify(client.SignTransaction.bind(client));
          const response = await Method({
            network: {
              provider: 'wss://api.clover.finance',
              ss58Format: 42,
            },
            serialized:
              '6d038400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca4612020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001002d02001a0008090000f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca46120b00407a10f35a00090508009235b080b6ca2e7b2a7af7a46ac4f677bfa394e29d83611324046c38eb14ee4900222c5fa244583b1734ceb6515916efc5e103f65b869ebec4e56b989d9dbb446e',
            signatures: [
              {
                signature:
                  '7e20121fd5f344b54b872826437e64b733d41f9f13e908922e521cd7e47f37c9c99356e78acae48ddf5a2918a016a347009e7c4b64b63a615445cdc62c1bdc3500',
              },
            ],
          });
          const { hash, serialized } = response;
          expect(hash).toEqual('e34d8df03b3e29c9764352ed03d9ccb56e298ec33fa5155780a58d4fe9a8c598');
          expect(serialized).toEqual(
            '6d038400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca4612027e20121fd5f344b54b872826437e64b733d41f9f13e908922e521cd7e47f37c9c99356e78acae48ddf5a2918a016a347009e7c4b64b63a615445cdc62c1bdc3500002d02001a0008090000f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca46120b00407a10f35a00090508009235b080b6ca2e7b2a7af7a46ac4f677bfa394e29d83611324046c38eb14ee4900222c5fa244583b1734ceb6515916efc5e103f65b869ebec4e56b989d9dbb446e',
          );
        });
      });

      //https://clover-testnet.subscan.io/extrinsic/0xd092d91896f3a57dfac939b8166d7dcfd5cd3a24b822a16295f2e1a816dc959f
      describe('Staking nominate, txid="0xd092d91896f3a57dfac939b8166d7dcfd5cd3a24b822a16295f2e1a816dc959f"', () => {
        test('BuildStakingNominateTransaction', async () => {
          const Method = promisify(client.BuildStakingNominateTransaction.bind(client));
          const response = await Method({
            network: {
              provider: 'wss://api.clover.finance',
              ss58Format: 42,
            },
            from: '5HhZWYeLNRbpofy4F34vVENgwxQVE8HGWhprVE6MPPCqUdRn',
            targets: ['5FNQoCoibJMAyqC77og9tSbhGUtaVt51SD7GdCxmMeWxPBvX'],
            params: {
              nonce: 141,
            },
          });
          const { callHex, serialized, signatures } = response;
          expect(callHex).toEqual('090504009235b080b6ca2e7b2a7af7a46ac4f677bfa394e29d83611324046c38eb14ee49');
          expect(serialized).toEqual(
            '31028400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca461202000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100350200090504009235b080b6ca2e7b2a7af7a46ac4f677bfa394e29d83611324046c38eb14ee49',
          );
          expect(signatures).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                hash: '017c0c7869e2c144102ae4f44c8e433b5e987889913d9251baa946b02b259435',
              }),
            ]),
          );
        });

        test('SignTransaction', async () => {
          const Method = promisify(client.SignTransaction.bind(client));
          const response = await Method({
            network: {
              provider: 'wss://api.clover.finance',
              ss58Format: 42,
            },
            serialized:
              '31028400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca461202000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100350200090504009235b080b6ca2e7b2a7af7a46ac4f677bfa394e29d83611324046c38eb14ee49',
            signatures: [
              {
                signature:
                  '12dc68848ed51c95cc2a96423e0dff324c6973acf008c05ee1cd5808a9da8258e3ede366f92a23c3a0e03b16123d06e348d0db73b3bac6c463bab29a0b17909a01',
              },
            ],
          });
          const { hash, serialized } = response;
          expect(hash).toEqual('d092d91896f3a57dfac939b8166d7dcfd5cd3a24b822a16295f2e1a816dc959f');
          expect(serialized).toEqual(
            '31028400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca46120212dc68848ed51c95cc2a96423e0dff324c6973acf008c05ee1cd5808a9da8258e3ede366f92a23c3a0e03b16123d06e348d0db73b3bac6c463bab29a0b17909a0100350200090504009235b080b6ca2e7b2a7af7a46ac4f677bfa394e29d83611324046c38eb14ee49',
          );
        });
      });

      describe('Staking bondExtra, txid="0x7942316a76b4bd2d2f8c388ff0f2cc3a45081a7916b208bc8835ac986bb1854d"', () => {
        test('BuildStakingBondExtraTransaction', async () => {
          const Method = promisify(client.BuildStakingBondExtraTransaction.bind(client));
          const response = await Method({
            network: {
              provider: 'wss://api.clover.finance',
              ss58Format: 42,
            },
            from: '5HhZWYeLNRbpofy4F34vVENgwxQVE8HGWhprVE6MPPCqUdRn',
            maxAdditional: '100000000000000',
            params: {
              nonce: 142,
            },
          });
          const { callHash, callHex, serialized, signatures } = response;
          expect(callHash).toEqual('209d6a0a617acd2c95ec597be399204acec85727b71ee0e6080a48c4768eaa3e');
          expect(callHex).toEqual('09010b00407a10f35a');
          expect(serialized).toEqual(
            'c5018400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca46120200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010039020009010b00407a10f35a',
          );
          expect(signatures).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                hash: '23bbeaba6fa1c88949d976436416a7faf50494078350db16d3acb389e738b4f8',
              }),
            ]),
          );
        });

        test('SignTransaction', async () => {
          const Method = promisify(client.SignTransaction.bind(client));
          const response = await Method({
            network: {
              provider: 'wss://api.clover.finance',
              ss58Format: 42,
            },
            serialized:
              'c5018400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca46120200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010039020009010b00407a10f35a',
            signatures: [
              {
                signature:
                  'b99e0bb9ca92e7d496610f1157e7ee7cd0bfd6842737935e7d1795f8abdca8c71c4f23120d6c58657e3b3213320c488de959f707bcaec335365f96692d12a39d01',
              },
            ],
          });
          const { hash, serialized } = response;
          expect(hash).toEqual('7942316a76b4bd2d2f8c388ff0f2cc3a45081a7916b208bc8835ac986bb1854d');
          expect(serialized).toEqual(
            'c5018400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca461202b99e0bb9ca92e7d496610f1157e7ee7cd0bfd6842737935e7d1795f8abdca8c71c4f23120d6c58657e3b3213320c488de959f707bcaec335365f96692d12a39d010039020009010b00407a10f35a',
          );
        });
      });

      describe('Staking unbond, txid="0x48b030ef859c1bb16c41f05b220d0c315e2c53b912c66584af0da6ec611d93eb"', () => {
        test('BuildStakingUnbondTransaction', async () => {
          const Method = promisify(client.BuildStakingUnbondTransaction.bind(client));
          const response = await Method({
            network: {
              provider: 'wss://api.clover.finance',
              ss58Format: 42,
            },
            from: '5HhZWYeLNRbpofy4F34vVENgwxQVE8HGWhprVE6MPPCqUdRn',
            quantity: '100000000000000',
            params: {
              nonce: 143,
            },
          });
          const { callHex, serialized, signatures } = response;
          expect(callHex).toEqual('09020b00407a10f35a');
          expect(serialized).toEqual(
            'c5018400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca4612020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001003d020009020b00407a10f35a',
          );
          expect(signatures).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                hash: 'f9eb59b9287f11192d497ee1ab4a53d848be74460e482aaa40a8acbecf778bc0',
              }),
            ]),
          );
        });

        test('SignTransaction', async () => {
          const Method = promisify(client.SignTransaction.bind(client));
          const response = await Method({
            network: {
              provider: 'wss://api.clover.finance',
              ss58Format: 42,
            },
            serialized:
              'c5018400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca4612020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001003d020009020b00407a10f35a',
            signatures: [
              {
                signature:
                  '34baad60ae202671acb907a09041353e38069ffa79cd2ef1d59c448b5c02509afc6f2276ac76479ed208e03ffb4ed6e533f7cc2eb8f447084e00864b7b7f5f1301',
              },
            ],
          });
          const { hash, serialized } = response;
          expect(hash).toEqual('48b030ef859c1bb16c41f05b220d0c315e2c53b912c66584af0da6ec611d93eb');
          expect(serialized).toEqual(
            'c5018400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca46120234baad60ae202671acb907a09041353e38069ffa79cd2ef1d59c448b5c02509afc6f2276ac76479ed208e03ffb4ed6e533f7cc2eb8f447084e00864b7b7f5f1301003d020009020b00407a10f35a',
          );
        });
      });

      //TODO test for it.
      describe('Staking withdrawUnbonded, txid=""', () => {
        test('BuildStakingWithdrawUnbondedTransaction', async () => {
          const Method = promisify(client.BuildStakingWithdrawUnbondedTransaction.bind(client));
          const response = await Method({
            network: {
              provider: 'wss://api.clover.finance',
              ss58Format: 42,
            },
            from: '5HhZWYeLNRbpofy4F34vVENgwxQVE8HGWhprVE6MPPCqUdRn',
            numSlashingSpans: '1',
            params: {
              nonce: 144,
            },
          });
          const { callHex, serialized, signatures } = response;
          expect(callHex).toEqual('090301000000');
          expect(serialized).toEqual(
            'b9018400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca461202000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100410200090301000000',
          );
          expect(signatures).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                hash: '2c0442e902270b85d9e6b6b31338dfd1c6152e0f4f7c6bcaabf4eb7c92042b4b',
              }),
            ]),
          );
        });

        test.skip('SignTransaction', async () => {
          const Method = promisify(client.SignTransaction.bind(client));
          const response = await Method({
            network: {
              provider: 'wss://api.clover.finance',
              ss58Format: 42,
            },
            serialized:
              'c5018400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca4612020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001003d020009020b00407a10f35a',
            signatures: [
              {
                signature:
                  '34baad60ae202671acb907a09041353e38069ffa79cd2ef1d59c448b5c02509afc6f2276ac76479ed208e03ffb4ed6e533f7cc2eb8f447084e00864b7b7f5f1301',
              },
            ],
          });
          const { hash, serialized } = response;
          expect(hash).toEqual('48b030ef859c1bb16c41f05b220d0c315e2c53b912c66584af0da6ec611d93eb');
          expect(serialized).toEqual(
            'c5018400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca46120234baad60ae202671acb907a09041353e38069ffa79cd2ef1d59c448b5c02509afc6f2276ac76479ed208e03ffb4ed6e533f7cc2eb8f447084e00864b7b7f5f1301003d020009020b00407a10f35a',
          );
        });
      });
    });

    describe('Multi Account', () => {
      describe('2-3 multisig account, send 0.1 CLV, canceled', () => {
        describe('Get the CallHex and CallHash', () => {
          test(
            'BuildTransferTransaction, method only ',
            async () => {
              const Method = promisify(client.BuildTransferTransaction.bind(client));
              const { callHex, callHash, serialized, signatures, estimatedFee } = await Method({
                network: {
                  provider: 'wss://api.clover.finance',
                  ss58Format: 42,
                },
                params: {
                  methodOnly: true,
                },
                to: '5HhZWYeLNRbpofy4F34vVENgwxQVE8HGWhprVE6MPPCqUdRn',
                quantity: '100000000000000000',
                from: '5Gj9zP2Rr7ZTu9RWfSZ8W62tf1kcmsoLYSeX6BqDwUHQKw7j',
              });
              expect(callHash).toStrictEqual('2016882e7f24c927ee46731119eb0d0fbf75d995ae454feacb0728ff201f571d');
              expect(callHex).toStrictEqual('070000f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca46121300008a5d78456301');
              expect(estimatedFee).toBeUndefined();
              expect(serialized).toBeUndefined();
              expect(signatures).toBeUndefined();
            },
            60 * 1000,
          );
        });

        describe('ApproveAsMulti, tx="0xb67881c948b4eb4b2577d4ab800e7d89a7de09d6d6ac61a7735e4d9219c4b93a"', () => {
          test('BuildMultisigApproveAsMultiTransaction', async () => {
            const wss = 'wss://api.clover.finance';
            const ss58Format = 42;
            const api = await provider.getApi(wss, ss58Format);
            Object.defineProperty(api.query.multisig, 'multisigs', {
              value: jest.fn().mockResolvedValueOnce({ isSome: false }),
              configurable: true,
              writable: true,
            });
            const Method = promisify(client.BuildMultisigApproveAsMultiTransaction.bind(client));
            const { serialized, signatures, estimatedFee } = await Method({
              network: {
                provider: wss,
                ss58Format,
              },
              params: {
                nonce: 227,
              },
              pubKeys: [
                '0346219571358630cf0565dc9826f4583014a32d2230f04df77b6c2097c2e09624',
                '026970416978b59b81347a6764e2891d5f1894cb3c7f03874d77bcd65e8c3f8613',
                '020c0ad3825f41eda2c533659a8ce891c0e4fd78e8f1c753fa85992fdfd38236bd',
              ],
              threshold: 2,
              signer: '5HhZWYeLNRbpofy4F34vVENgwxQVE8HGWhprVE6MPPCqUdRn',
              callHash: '2016882e7f24c927ee46731119eb0d0fbf75d995ae454feacb0728ff201f571d',
              callHex: '070000f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca46121300008a5d78456301',
            });

            expect(estimatedFee).toBeDefined();
            expect(serialized).toEqual(
              '59038400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca4612020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001008d03001d0202000826146dc16221b108d05e7d792e27e3851d15ce1887cf62a9ccea554e43426a53821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaa002016882e7f24c927ee46731119eb0d0fbf75d995ae454feacb0728ff201f571d00a0252600000000',
            );
            expect(signatures).toEqual(
              expect.arrayContaining([
                expect.objectContaining({
                  hash: '14ad724a150f4f4634bf30c6bfa823cfdfb1e53b0c071a70660abaf5ca7b51f5',
                }),
              ]),
            );
          });

          test('SignTransaction', async () => {
            const Method = promisify(client.SignTransaction.bind(client));
            const response = await Method({
              network: {
                provider: 'wss://api.clover.finance',
                ss58Format: 42,
              },
              serialized:
                '59038400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca4612020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001008d03001d0202000826146dc16221b108d05e7d792e27e3851d15ce1887cf62a9ccea554e43426a53821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaa002016882e7f24c927ee46731119eb0d0fbf75d995ae454feacb0728ff201f571d00a0252600000000',
              signatures: [
                {
                  signature:
                    'ed39fa00128b293f8ee1f716126dfbdacf25d5eb6380ca4a5c04f50447cdb2230d4d266ce8ee18e0786abec170a9e1f231ef8c1fe65733a79fa9742f4fb7ba7a00',
                },
              ],
            });
            const { hash, serialized } = response;
            expect(hash).toEqual('b67881c948b4eb4b2577d4ab800e7d89a7de09d6d6ac61a7735e4d9219c4b93a');
            expect(serialized).toEqual(
              '59038400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca461202ed39fa00128b293f8ee1f716126dfbdacf25d5eb6380ca4a5c04f50447cdb2230d4d266ce8ee18e0786abec170a9e1f231ef8c1fe65733a79fa9742f4fb7ba7a00008d03001d0202000826146dc16221b108d05e7d792e27e3851d15ce1887cf62a9ccea554e43426a53821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaa002016882e7f24c927ee46731119eb0d0fbf75d995ae454feacb0728ff201f571d00a0252600000000',
            );
          });
        });

        describe('CancelAsMulti, tx="0xea1960b7d8e393961b69542fb78b0d354cb9832b28de88c2dbc5f6edab3979c6"', () => {
          test(
            'BuildMultisigCancelAsMultiTransaction',
            async () => {
              const wss = 'wss://api.clover.finance';
              const ss58Format = 42;
              const api = await provider.getApi(wss, ss58Format);

              jest.spyOn(provider, 'getApi').mockResolvedValueOnce(api);
              Object.defineProperty(api.query.multisig, 'multisigs', {
                value: jest
                  .fn()
                  .mockResolvedValueOnce({ isSome: true, unwrap: jest.fn().mockReturnValue({ when: { height: 4950043, index: 1 } }) }),
                configurable: true,
                writable: true,
              });

              const Method = promisify(client.BuildMultisigCancelAsMultiTransaction.bind(client));
              const { serialized, signatures, estimatedFee } = await Method({
                network: {
                  provider: wss,
                  ss58Format,
                },
                params: {
                  nonce: 228,
                },
                pubKeys: [
                  '0346219571358630cf0565dc9826f4583014a32d2230f04df77b6c2097c2e09624',
                  '026970416978b59b81347a6764e2891d5f1894cb3c7f03874d77bcd65e8c3f8613',
                  '020c0ad3825f41eda2c533659a8ce891c0e4fd78e8f1c753fa85992fdfd38236bd',
                ],
                threshold: 2,
                signer: '5HhZWYeLNRbpofy4F34vVENgwxQVE8HGWhprVE6MPPCqUdRn',
                callHash: '2016882e7f24c927ee46731119eb0d0fbf75d995ae454feacb0728ff201f571d',
                callHex: '070000f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca46121300008a5d78456301',
              });

              expect(estimatedFee).toBeDefined();
              expect(serialized).toEqual(
                '55038400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca4612020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001009103001d0302000826146dc16221b108d05e7d792e27e3851d15ce1887cf62a9ccea554e43426a53821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaa1b884b00010000002016882e7f24c927ee46731119eb0d0fbf75d995ae454feacb0728ff201f571d',
              );
              expect(signatures).toEqual(
                expect.arrayContaining([
                  expect.objectContaining({
                    hash: '09fa33ca6bb0f60720c44dfd6c25d40696f691808e2bc58a6082aefcd4beb0a3',
                  }),
                ]),
              );
            },
            60 * 1000,
          );

          test('SignTransaction', async () => {
            const Method = promisify(client.SignTransaction.bind(client));
            const response = await Method({
              network: {
                provider: 'wss://api.clover.finance',
                ss58Format: 42,
              },
              serialized:
                '55038400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca4612020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001009103001d0302000826146dc16221b108d05e7d792e27e3851d15ce1887cf62a9ccea554e43426a53821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaa1b884b00010000002016882e7f24c927ee46731119eb0d0fbf75d995ae454feacb0728ff201f571d',
              signatures: [
                {
                  signature:
                    '1ef1bd3fd7a9402bfdc041a65c65c89e74bdaadf282625f2c232611980fcb8f9db5708e0b239e009e3ee884bf73c1759c605fc71f7f48e137abf0090a3cb1efc01',
                },
              ],
            });
            const { hash, serialized } = response;
            expect(hash).toEqual('ea1960b7d8e393961b69542fb78b0d354cb9832b28de88c2dbc5f6edab3979c6');
            expect(serialized).toEqual(
              '55038400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca4612021ef1bd3fd7a9402bfdc041a65c65c89e74bdaadf282625f2c232611980fcb8f9db5708e0b239e009e3ee884bf73c1759c605fc71f7f48e137abf0090a3cb1efc01009103001d0302000826146dc16221b108d05e7d792e27e3851d15ce1887cf62a9ccea554e43426a53821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaa1b884b00010000002016882e7f24c927ee46731119eb0d0fbf75d995ae454feacb0728ff201f571d',
            );
          });
        });
      });

      describe('2-3 multisig account, send 0.1 CLV, succeeded', () => {
        describe('Get the CallHex and CallHash', () => {
          test(
            'BuildTransferTransaction, method only',
            async () => {
              const Method = promisify(client.BuildTransferTransaction.bind(client));
              const { callHex, callHash, serialized, signatures, estimatedFee } = await Method({
                network: {
                  provider: 'wss://api.clover.finance',
                  ss58Format: 42,
                },
                params: {
                  methodOnly: true,
                },
                to: '5HhZWYeLNRbpofy4F34vVENgwxQVE8HGWhprVE6MPPCqUdRn',
                quantity: '100000000000000000',
                from: '5Gj9zP2Rr7ZTu9RWfSZ8W62tf1kcmsoLYSeX6BqDwUHQKw7j',
              });
              expect(callHash).toStrictEqual('2016882e7f24c927ee46731119eb0d0fbf75d995ae454feacb0728ff201f571d');
              expect(callHex).toStrictEqual('070000f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca46121300008a5d78456301');
              expect(estimatedFee).toBeUndefined();
              expect(serialized).toBeUndefined();
              expect(signatures).toBeUndefined();
            },
            60 * 1000,
          );
        });

        describe('ApproveAsMulti, tx="0xca544633ebaeb660069a2a33d90a3fc57c8945e6e0c9679b80ba75caafc5e6a5"', () => {
          test(
            'BuildMultisigApproveAsMultiTransaction',
            async () => {
              const wss = 'wss://api.clover.finance';
              const ss58Format = 42;
              const api = await provider.getApi(wss, ss58Format);

              jest.spyOn(provider, 'getApi').mockResolvedValueOnce(api);
              Object.defineProperty(api.query.multisig, 'multisigs', {
                value: jest.fn().mockResolvedValueOnce({ isSome: false }),
                configurable: true,
                writable: true,
              });

              const Method = promisify(client.BuildMultisigApproveAsMultiTransaction.bind(client));
              const { serialized, signatures, estimatedFee } = await Method({
                network: {
                  provider: wss,
                  ss58Format,
                },
                params: {
                  nonce: 229,
                },
                pubKeys: [
                  '0346219571358630cf0565dc9826f4583014a32d2230f04df77b6c2097c2e09624',
                  '026970416978b59b81347a6764e2891d5f1894cb3c7f03874d77bcd65e8c3f8613',
                  '020c0ad3825f41eda2c533659a8ce891c0e4fd78e8f1c753fa85992fdfd38236bd',
                ],
                threshold: 2,
                signer: '5HhZWYeLNRbpofy4F34vVENgwxQVE8HGWhprVE6MPPCqUdRn',
                callHash: '2016882e7f24c927ee46731119eb0d0fbf75d995ae454feacb0728ff201f571d',
                callHex: '070000f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca46121300008a5d78456301',
              });

              expect(estimatedFee).toBeDefined();
              expect(serialized).toEqual(
                '59038400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca4612020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001009503001d0202000826146dc16221b108d05e7d792e27e3851d15ce1887cf62a9ccea554e43426a53821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaa002016882e7f24c927ee46731119eb0d0fbf75d995ae454feacb0728ff201f571d00a0252600000000',
              );
              expect(signatures).toEqual(
                expect.arrayContaining([
                  expect.objectContaining({
                    hash: '858ad0eeba7a70a60ade56fdc4e54ed5b45551e2c4a775e605bf6a6a86796872',
                  }),
                ]),
              );
            },
            60 * 1000,
          );

          test('SignTransaction', async () => {
            const Method = promisify(client.SignTransaction.bind(client));
            const response = await Method({
              network: {
                provider: 'wss://api.clover.finance',
                ss58Format: 42,
              },
              serialized:
                '59038400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca4612020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001009503001d0202000826146dc16221b108d05e7d792e27e3851d15ce1887cf62a9ccea554e43426a53821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaa002016882e7f24c927ee46731119eb0d0fbf75d995ae454feacb0728ff201f571d00a0252600000000',
              signatures: [
                {
                  signature:
                    '48771afd8d3e4db305caf9ffa8ac74f22bc520dc6333bc98fbf0562e552af3cca493ead5724dedd5ded8ec9f704c294a98be9bc0f49ce8ebea90d1eea3d1970201',
                },
              ],
            });
            const { hash, serialized } = response;
            expect(hash).toEqual('ca544633ebaeb660069a2a33d90a3fc57c8945e6e0c9679b80ba75caafc5e6a5');
            expect(serialized).toEqual(
              '59038400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca46120248771afd8d3e4db305caf9ffa8ac74f22bc520dc6333bc98fbf0562e552af3cca493ead5724dedd5ded8ec9f704c294a98be9bc0f49ce8ebea90d1eea3d1970201009503001d0202000826146dc16221b108d05e7d792e27e3851d15ce1887cf62a9ccea554e43426a53821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaa002016882e7f24c927ee46731119eb0d0fbf75d995ae454feacb0728ff201f571d00a0252600000000',
            );
          });
        });

        describe('AsMulti, tx="0xa73d0f55d645b1f16508083ff93215745f3b3733908fb144d27bdcc8875ffff2"', () => {
          test(
            'BuildMultisigAsMultiTransaction',
            async () => {
              const wss = 'wss://api.clover.finance';
              const ss58Format = 42;
              const api = await provider.getApi(wss, ss58Format);

              jest.spyOn(provider, 'getApi').mockResolvedValueOnce(api);
              Object.defineProperty(api.query.multisig, 'multisigs', {
                value: jest
                  .fn()
                  .mockResolvedValueOnce({ isSome: true, unwrap: jest.fn().mockReturnValue({ when: { height: 4951211, index: 1 } }) }),
                configurable: true,
                writable: true,
              });

              const Method = promisify(client.BuildMultisigAsMultiTransaction.bind(client));
              const { serialized, signatures, estimatedFee } = await Method({
                network: {
                  provider: wss,
                  ss58Format,
                },
                params: {
                  nonce: 38,
                },
                pubKeys: [
                  '0346219571358630cf0565dc9826f4583014a32d2230f04df77b6c2097c2e09624',
                  '026970416978b59b81347a6764e2891d5f1894cb3c7f03874d77bcd65e8c3f8613',
                  '020c0ad3825f41eda2c533659a8ce891c0e4fd78e8f1c753fa85992fdfd38236bd',
                ],
                threshold: 2,
                signer: '5F1GPrYp5Q32Hr3hczZXoJCTxNhuQxsBbABtSjDnVK9Fn9dZ',
                callHash: '2016882e7f24c927ee46731119eb0d0fbf75d995ae454feacb0728ff201f571d',
                callHex: '070000f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca46121300008a5d78456301',
              });

              expect(estimatedFee).toBeDefined();
              expect(serialized).toEqual(
                'ad038400821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaa0200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010098001d0102000826146dc16221b108d05e7d792e27e3851d15ce1887cf62a9ccea554e43426a53f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca461201ab8c4b0001000000b0070000f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca46121300008a5d784563010000a0252600000000',
              );
              expect(signatures).toEqual(
                expect.arrayContaining([
                  expect.objectContaining({
                    hash: '99b4e68d0c5c164d2e012a631311d7be93b2f75fddf7f943da585aa5539c4647',
                  }),
                ]),
              );
            },
            60 * 1000,
          );

          test('SignTransaction', async () => {
            const Method = promisify(client.SignTransaction.bind(client));
            const response = await Method({
              network: {
                provider: 'wss://api.clover.finance',
                ss58Format: 42,
              },
              serialized:
                'ad038400821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaa0200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010098001d0102000826146dc16221b108d05e7d792e27e3851d15ce1887cf62a9ccea554e43426a53f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca461201ab8c4b0001000000b0070000f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca46121300008a5d784563010000a0252600000000',
              signatures: [
                {
                  signature:
                    'f814235f02abd36cd10bdb5a6e2082e627eb8dd5e6fff6c5868008001d8334285eac33c36fdd5468d64c2449883d5d6f0a9d5b5d31d55fec031f42f682a6d00c01',
                },
              ],
            });
            const { hash, serialized } = response;
            expect(hash).toEqual('a73d0f55d645b1f16508083ff93215745f3b3733908fb144d27bdcc8875ffff2');
            expect(serialized).toEqual(
              'ad038400821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaa02f814235f02abd36cd10bdb5a6e2082e627eb8dd5e6fff6c5868008001d8334285eac33c36fdd5468d64c2449883d5d6f0a9d5b5d31d55fec031f42f682a6d00c010098001d0102000826146dc16221b108d05e7d792e27e3851d15ce1887cf62a9ccea554e43426a53f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca461201ab8c4b0001000000b0070000f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca46121300008a5d784563010000a0252600000000',
            );
          });
        });
      });

      describe('2-3 multisig account, bondExtra 0.1 CLV, canceled', () => {
        describe('Get the CallHex and CallHash', () => {
          test(
            'BuildStakingBondExtraTransaction, method only',
            async () => {
              const Method = promisify(client.BuildStakingBondExtraTransaction.bind(client));
              const { callHex, callHash, serialized, signatures, estimatedFee } = await Method({
                network: {
                  provider: 'wss://api.clover.finance',
                  ss58Format: 42,
                },
                params: {
                  methodOnly: true,
                },
                from: '5Gj9zP2Rr7ZTu9RWfSZ8W62tf1kcmsoLYSeX6BqDwUHQKw7j',
                maxAdditional: '100000000000000000',
              });
              expect(callHash).toStrictEqual('851f64282d0567109a3cd1271eda7b8d8de1ba3a8f8458e53a64d1a19b196b42');
              expect(callHex).toStrictEqual('09011300008a5d78456301');
              expect(estimatedFee).toBeUndefined();
              expect(serialized).toBeUndefined();
              expect(signatures).toBeUndefined();
            },
            60 * 1000,
          );
        });

        describe('ApproveAsMulti, tx="0x031b15148374088d59004037d7575bccbb973f029ee2de667d1713376b0efe09"', () => {
          test(
            'BuildMultisigApproveAsMultiTransaction',
            async () => {
              const wss = 'wss://api.clover.finance';
              const ss58Format = 42;
              const api = await provider.getApi(wss, ss58Format);
              jest.spyOn(provider, 'getApi').mockResolvedValueOnce(api);
              Object.defineProperty(api.query.multisig, 'multisigs', {
                value: jest.fn().mockResolvedValueOnce({ isSome: false }),
                configurable: true,
                writable: true,
              });

              const Method = promisify(client.BuildMultisigApproveAsMultiTransaction.bind(client));
              const { serialized, signatures, estimatedFee } = await Method({
                network: {
                  provider: wss,
                  ss58Format,
                },
                params: {
                  nonce: 230,
                },
                pubKeys: [
                  '0346219571358630cf0565dc9826f4583014a32d2230f04df77b6c2097c2e09624',
                  '026970416978b59b81347a6764e2891d5f1894cb3c7f03874d77bcd65e8c3f8613',
                  '020c0ad3825f41eda2c533659a8ce891c0e4fd78e8f1c753fa85992fdfd38236bd',
                ],
                threshold: 2,
                signer: '5HhZWYeLNRbpofy4F34vVENgwxQVE8HGWhprVE6MPPCqUdRn',
                callHash: '851f64282d0567109a3cd1271eda7b8d8de1ba3a8f8458e53a64d1a19b196b42',
                callHex: '09011300008a5d78456301',
              });

              expect(estimatedFee).toBeDefined();
              expect(serialized).toEqual(
                '59038400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca4612020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001009903001d0202000826146dc16221b108d05e7d792e27e3851d15ce1887cf62a9ccea554e43426a53821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaa00851f64282d0567109a3cd1271eda7b8d8de1ba3a8f8458e53a64d1a19b196b4200a0252600000000',
              );
              expect(signatures).toEqual(
                expect.arrayContaining([
                  expect.objectContaining({
                    hash: 'a25295c586bc20920da0ea79bc82c10c53f5963038dd9fccad5ecad29c9efe69',
                  }),
                ]),
              );
            },
            60 * 1000,
          );

          test('SignTransaction', async () => {
            const Method = promisify(client.SignTransaction.bind(client));
            const response = await Method({
              network: {
                provider: 'wss://api.clover.finance',
                ss58Format: 42,
              },
              serialized:
                '59038400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca4612020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001009903001d0202000826146dc16221b108d05e7d792e27e3851d15ce1887cf62a9ccea554e43426a53821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaa00851f64282d0567109a3cd1271eda7b8d8de1ba3a8f8458e53a64d1a19b196b4200a0252600000000',
              signatures: [
                {
                  signature:
                    '202bfc86a634c33e1dc2d7a64d2b228d068c013405645d3138cb4440b872902be184dad06a69fb235e4f8c44d1def219a727a9c32c99bf35e8f4767b3bfc5e7d01',
                },
              ],
            });
            const { hash, serialized } = response;
            expect(hash).toEqual('1ee0bfdb9a0e7bf035d014531992f82451d09e5ca718dea4b5821c48b26ee583');
            expect(serialized).toEqual(
              '59038400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca461202202bfc86a634c33e1dc2d7a64d2b228d068c013405645d3138cb4440b872902be184dad06a69fb235e4f8c44d1def219a727a9c32c99bf35e8f4767b3bfc5e7d01009903001d0202000826146dc16221b108d05e7d792e27e3851d15ce1887cf62a9ccea554e43426a53821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaa00851f64282d0567109a3cd1271eda7b8d8de1ba3a8f8458e53a64d1a19b196b4200a0252600000000',
            );
          });
        });

        describe('CancelAsMulti, tx="0x116faffdb58824e2be9819b7781c12c0cb516b47622279a6dc13c84b180fee6c"', () => {
          test(
            'BuildMultisigCancelAsMultiTransaction',
            async () => {
              const wss = 'wss://api.clover.finance';
              const ss58Format = 42;
              const api = await provider.getApi(wss, ss58Format);

              jest.spyOn(provider, 'getApi').mockResolvedValueOnce(api);
              Object.defineProperty(api.query.multisig, 'multisigs', {
                value: jest
                  .fn()
                  .mockResolvedValueOnce({ isSome: true, unwrap: jest.fn().mockReturnValue({ when: { height: 4951661, index: 1 } }) }),
                configurable: true,
                writable: true,
              });

              const Method = promisify(client.BuildMultisigCancelAsMultiTransaction.bind(client));
              const { serialized, signatures, estimatedFee } = await Method({
                network: {
                  provider: wss,
                  ss58Format,
                },
                params: {
                  nonce: 231,
                },
                pubKeys: [
                  '0346219571358630cf0565dc9826f4583014a32d2230f04df77b6c2097c2e09624',
                  '026970416978b59b81347a6764e2891d5f1894cb3c7f03874d77bcd65e8c3f8613',
                  '020c0ad3825f41eda2c533659a8ce891c0e4fd78e8f1c753fa85992fdfd38236bd',
                ],
                threshold: 2,
                signer: '5HhZWYeLNRbpofy4F34vVENgwxQVE8HGWhprVE6MPPCqUdRn',
                callHash: '851f64282d0567109a3cd1271eda7b8d8de1ba3a8f8458e53a64d1a19b196b42',
                callHex: '09011300008a5d78456301',
              });

              expect(estimatedFee).toBeDefined();
              expect(serialized).toEqual(
                '55038400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca4612020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001009d03001d0302000826146dc16221b108d05e7d792e27e3851d15ce1887cf62a9ccea554e43426a53821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaa6d8e4b0001000000851f64282d0567109a3cd1271eda7b8d8de1ba3a8f8458e53a64d1a19b196b42',
              );
              expect(signatures).toEqual(
                expect.arrayContaining([
                  expect.objectContaining({
                    hash: '3785c23676ae3cfe8f5db05c2966bfd1ed14d1b538519bddd0d33917c0dbc5fe',
                  }),
                ]),
              );
            },
            60 * 1000,
          );

          test(
            'SignTransaction',
            async () => {
              const Method = promisify(client.SignTransaction.bind(client));
              const response = await Method({
                network: {
                  provider: 'wss://api.clover.finance',
                  ss58Format: 42,
                },
                serialized:
                  '55038400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca4612020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001009d03001d0302000826146dc16221b108d05e7d792e27e3851d15ce1887cf62a9ccea554e43426a53821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaa6d8e4b0001000000851f64282d0567109a3cd1271eda7b8d8de1ba3a8f8458e53a64d1a19b196b42',
                signatures: [
                  {
                    signature:
                      'd2815cf2c96ccce91b7e878772c4d364ec2a00dd02540b82031411ec4b37e6e7e3ae708863ed3d9e2740f1b4e93f882ae92ac32610dcea71fd501bec8e7c76fb00',
                  },
                ],
              });
              const { hash, serialized } = response;
              expect(hash).toEqual('116faffdb58824e2be9819b7781c12c0cb516b47622279a6dc13c84b180fee6c');
              expect(serialized).toEqual(
                '55038400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca461202d2815cf2c96ccce91b7e878772c4d364ec2a00dd02540b82031411ec4b37e6e7e3ae708863ed3d9e2740f1b4e93f882ae92ac32610dcea71fd501bec8e7c76fb00009d03001d0302000826146dc16221b108d05e7d792e27e3851d15ce1887cf62a9ccea554e43426a53821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaa6d8e4b0001000000851f64282d0567109a3cd1271eda7b8d8de1ba3a8f8458e53a64d1a19b196b42',
              );
            },
            60 * 1000,
          );
        });
      });

      describe('2-3 multisig account, bondExtra 0.1 CLV, succeeded', () => {
        describe('ApproveAsMulti, tx="0x2aadd02da80628da69a03654eac4d2866d3a76376634c9bee60f470f1812731d"', () => {
          test(
            'BuildMultisigApproveAsMultiTransaction',
            async () => {
              const wss = 'wss://api.clover.finance';
              const ss58Format = 42;
              const api = await provider.getApi(wss, ss58Format);

              jest.spyOn(provider, 'getApi').mockResolvedValueOnce(api);
              Object.defineProperty(api.query.multisig, 'multisigs', {
                value: jest.fn().mockResolvedValueOnce({ isSome: false }),
                configurable: true,
                writable: true,
              });

              const Method = promisify(client.BuildMultisigApproveAsMultiTransaction.bind(client));
              const { serialized, signatures, estimatedFee } = await Method({
                network: {
                  provider: wss,
                  ss58Format,
                },
                params: {
                  nonce: 232,
                },
                pubKeys: [
                  '0346219571358630cf0565dc9826f4583014a32d2230f04df77b6c2097c2e09624',
                  '026970416978b59b81347a6764e2891d5f1894cb3c7f03874d77bcd65e8c3f8613',
                  '020c0ad3825f41eda2c533659a8ce891c0e4fd78e8f1c753fa85992fdfd38236bd',
                ],
                threshold: 2,
                signer: '5HhZWYeLNRbpofy4F34vVENgwxQVE8HGWhprVE6MPPCqUdRn',
                callHash: '851f64282d0567109a3cd1271eda7b8d8de1ba3a8f8458e53a64d1a19b196b42',
                callHex: '09011300008a5d78456301',
              });

              expect(estimatedFee).toBeDefined();
              expect(serialized).toEqual(
                '59038400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca461202000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100a103001d0202000826146dc16221b108d05e7d792e27e3851d15ce1887cf62a9ccea554e43426a53821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaa00851f64282d0567109a3cd1271eda7b8d8de1ba3a8f8458e53a64d1a19b196b4200a0252600000000',
              );
              expect(signatures).toEqual(
                expect.arrayContaining([
                  expect.objectContaining({
                    hash: '34c1893d93b496444cacb4a0493da7be15afd9314fae5d76e6c67699892da928',
                  }),
                ]),
              );
            },
            60 * 1000,
          );

          test('SignTransaction', async () => {
            const Method = promisify(client.SignTransaction.bind(client));
            const response = await Method({
              network: {
                provider: 'wss://api.clover.finance',
                ss58Format: 42,
              },
              serialized:
                '59038400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca461202000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100a103001d0202000826146dc16221b108d05e7d792e27e3851d15ce1887cf62a9ccea554e43426a53821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaa00851f64282d0567109a3cd1271eda7b8d8de1ba3a8f8458e53a64d1a19b196b4200a0252600000000',
              signatures: [
                {
                  signature:
                    '10502ebd1c9c2bc37054342d3d9fced969553a98a54c9b3c9b4fff035974ea12ab87e69edcd80e8c69fe34abe28c1c03207cc33eea722bf448e0e892f72963c601',
                },
              ],
            });
            const { hash, serialized } = response;
            expect(hash).toEqual('2aadd02da80628da69a03654eac4d2866d3a76376634c9bee60f470f1812731d');
            expect(serialized).toEqual(
              '59038400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca46120210502ebd1c9c2bc37054342d3d9fced969553a98a54c9b3c9b4fff035974ea12ab87e69edcd80e8c69fe34abe28c1c03207cc33eea722bf448e0e892f72963c60100a103001d0202000826146dc16221b108d05e7d792e27e3851d15ce1887cf62a9ccea554e43426a53821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaa00851f64282d0567109a3cd1271eda7b8d8de1ba3a8f8458e53a64d1a19b196b4200a0252600000000',
            );
          });
        });

        describe('AsMulti, tx="0x3f73b2c6a4894b7f04e78c83b633cc7d7dbb7c2774c33dce57e90c8e6e0e9552"', () => {
          test(
            'BuildMultisigAsMultiTransaction',
            async () => {
              const wss = 'wss://api.clover.finance';
              const ss58Format = 42;
              const api = await provider.getApi(wss, ss58Format);
              jest.spyOn(provider, 'getApi').mockResolvedValueOnce(api);
              Object.defineProperty(api.query.multisig, 'multisigs', {
                value: jest
                  .fn()
                  .mockResolvedValueOnce({ isSome: true, unwrap: jest.fn().mockReturnValue({ when: { height: 4951870, index: 1 } }) }),
                configurable: true,
                writable: true,
              });

              const Method = promisify(client.BuildMultisigAsMultiTransaction.bind(client));
              const { serialized, signatures, estimatedFee } = await Method({
                network: {
                  provider: wss,
                  ss58Format,
                },
                params: {
                  nonce: 39,
                },
                pubKeys: [
                  '0346219571358630cf0565dc9826f4583014a32d2230f04df77b6c2097c2e09624',
                  '026970416978b59b81347a6764e2891d5f1894cb3c7f03874d77bcd65e8c3f8613',
                  '020c0ad3825f41eda2c533659a8ce891c0e4fd78e8f1c753fa85992fdfd38236bd',
                ],
                threshold: 2,
                signer: '5F1GPrYp5Q32Hr3hczZXoJCTxNhuQxsBbABtSjDnVK9Fn9dZ',
                callHash: '851f64282d0567109a3cd1271eda7b8d8de1ba3a8f8458e53a64d1a19b196b42',
                callHex: '09011300008a5d78456301',
              });

              expect(estimatedFee).toBeDefined();
              expect(serialized).toEqual(
                '29038400821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaa020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001009c001d0102000826146dc16221b108d05e7d792e27e3851d15ce1887cf62a9ccea554e43426a53f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca4612013e8f4b00010000002c09011300008a5d784563010000a0252600000000',
              );
              expect(signatures).toEqual(
                expect.arrayContaining([
                  expect.objectContaining({
                    hash: 'f25699c4ec8563778d6add262dfabed4a315ad95d6c8289c26b94d1c8c881757',
                  }),
                ]),
              );
            },
            60 * 1000,
          );

          test('SignTransaction', async () => {
            const Method = promisify(client.SignTransaction.bind(client));
            const response = await Method({
              network: {
                provider: 'wss://api.clover.finance',
                ss58Format: 42,
              },
              serialized:
                '29038400821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaa020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001009c001d0102000826146dc16221b108d05e7d792e27e3851d15ce1887cf62a9ccea554e43426a53f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca4612013e8f4b00010000002c09011300008a5d784563010000a0252600000000',
              signatures: [
                {
                  signature:
                    'beea82d02d988c3346ab0bf9996e6d920425d4e588bfd9c2433db97fe032318e0935d79f3c6efba4c3a252ac7d534283fadab87d4064b31d7c5689d6dede329001',
                },
              ],
            });
            const { hash, serialized } = response;
            expect(hash).toEqual('3f73b2c6a4894b7f04e78c83b633cc7d7dbb7c2774c33dce57e90c8e6e0e9552');
            expect(serialized).toEqual(
              '29038400821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaa02beea82d02d988c3346ab0bf9996e6d920425d4e588bfd9c2433db97fe032318e0935d79f3c6efba4c3a252ac7d534283fadab87d4064b31d7c5689d6dede329001009c001d0102000826146dc16221b108d05e7d792e27e3851d15ce1887cf62a9ccea554e43426a53f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca4612013e8f4b00010000002c09011300008a5d784563010000a0252600000000',
            );
          });
        });
      });
    });
  });
});
