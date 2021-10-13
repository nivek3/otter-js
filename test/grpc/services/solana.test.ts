import 'dotenv/config';
import path from 'path';
import { promisify } from 'util';

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { grpcServer } from '../../../src/services/grpc';

const PROTO_PATH = path.join(__dirname, '../../../proto/solana.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  longs: String,
  defaults: false,
  oneofs: true,
});
const Solana = (grpc.loadPackageDefinition(packageDefinition) as any)?.solana.Solana;
let client;

describe('Solana service', () => {
  describe('GRPC service', () => {
    beforeAll(async () => {
      await grpcServer.start();
      client = new Solana(`localhost:${process.env.GRPC_PORT}`, grpc.credentials.createInsecure());
    });

    afterAll(async () => {
      client?.close();
      await grpcServer.stop();
    });

    describe('DeployAccount', () => {
      test('generate address from public key', async () => {
        const expectedAddress = '2hieMSXcsk3F3bZE8iDe7WGREZesRDnDjHtdPVjya4NA';
        const DeployAccount = promisify(client.DeployAccount.bind(client));
        const response = await DeployAccount({
          key: '2hieMSXcsk3F3bZE8iDe7WGREZesRDnDjHtdPVjya4NA',
        });
        expect(response).toHaveProperty('address', expectedAddress);
      });
    });

    describe('SignTransaction', () => {
      test('sign transaction', async () => {
        const expectedSerialized =
          '0175d88294fd94f9b648cbb571ac9059667641e3b45bd9255769c8b8833c16cc228f61e8c957f490a7046cff9590352f503d98778a5e8be84c427fa52bf3a2590501000102194a019e14de7529a91bb5e42c6e8cc8a8bb180558436486a2b8f5dc6f488b1f00000000000000000000000000000000000000000000000000000000000000003a2fc035b32468de100d79849bae7b3a09afc701168aee7fd7cc24a633fe8fcf01010200000c02000000a0fab80100000000';
        const SignTransaction = promisify(client.SignTransaction.bind(client));
        const response = await SignTransaction({
          serialized:
            '010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000102194a019e14de7529a91bb5e42c6e8cc8a8bb180558436486a2b8f5dc6f488b1f00000000000000000000000000000000000000000000000000000000000000003a2fc035b32468de100d79849bae7b3a09afc701168aee7fd7cc24a633fe8fcf01010200000c02000000a0fab80100000000',
          signatures: [
            {
              signature:
                '75d88294fd94f9b648cbb571ac9059667641e3b45bd9255769c8b8833c16cc228f61e8c957f490a7046cff9590352f503d98778a5e8be84c427fa52bf3a25905',
            },
          ]
        });
        expect(response).toHaveProperty('serialized', expectedSerialized);
        expect(response).toHaveProperty('hash');
      });
    });

    describe('DecodeTransaction', () => {
      test('decode transfer transaction', async () => {
        const DecodeTransaction = promisify(client.DecodeTransaction.bind(client));
        const response = await DecodeTransaction({
          serialized:
            '0175d88294fd94f9b648cbb571ac9059667641e3b45bd9255769c8b8833c16cc228f61e8c957f490a7046cff9590352f503d98778a5e8be84c427fa52bf3a2590501000102194a019e14de7529a91bb5e42c6e8cc8a8bb180558436486a2b8f5dc6f488b1f00000000000000000000000000000000000000000000000000000000000000003a2fc035b32468de100d79849bae7b3a09afc701168aee7fd7cc24a633fe8fcf01010200000c02000000a0fab80100000000'
        });

        const expectedRecentBlockhash = '4v8su2yidSuisnf6f3E38gWW4DEDUrVkGDW1QkXGW6Ce'
        expect(response).toEqual(
          expect.objectContaining({
            recentBlockhash: expectedRecentBlockhash
          }),
        );
      });
    });

    describe('BuildTransferTransaction', () => {
        test('build transfer transaction', async () => {
            const BuildTransferTransaction = promisify(client.BuildTransferTransaction.bind(client));
            const response = await BuildTransferTransaction({
                to: "2hieMSXcsk3F3bZE8iDe7WGREZesRDnDjHtdPVjya4NA",
                from: "2hieMSXcsk3F3bZE8iDe7WGREZesRDnDjHtdPVjya4NA",
                quantity: "0.0289",
                network: {
                    "provider": "https://api.devnet.solana.com"
                },
                params: {
                    recentBlockhash: "4v8su2yidSuisnf6f3E38gWW4DEDUrVkGDW1QkXGW6Ce"
                }
            });
  
            const expectedSerialized = "010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000102194a019e14de7529a91bb5e42c6e8cc8a8bb180558436486a2b8f5dc6f488b1f00000000000000000000000000000000000000000000000000000000000000003a2fc035b32468de100d79849bae7b3a09afc701168aee7fd7cc24a633fe8fcf01010200000c02000000a0fab80100000000"
            const expectedSignatures = [{"hash": "01000102194a019e14de7529a91bb5e42c6e8cc8a8bb180558436486a2b8f5dc6f488b1f00000000000000000000000000000000000000000000000000000000000000003a2fc035b32468de100d79849bae7b3a09afc701168aee7fd7cc24a633fe8fcf01010200000c02000000a0fab80100000000"}]
            expect(response).toHaveProperty('serialized', expectedSerialized);
            expect(response).toHaveProperty('signatures', expectedSignatures);
        });
    });

    describe('RebuildTransaction', () => {
        test('rebuild transfer transaction', async () => {
            const RebuildTransaction = promisify(client.RebuildTransaction.bind(client));
            const response = await RebuildTransaction({
              serialized: '010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000102194a019e14de7529a91bb5e42c6e8cc8a8bb180558436486a2b8f5dc6f488b1f00000000000000000000000000000000000000000000000000000000000000006b911e0ee7b2d5786f9158683a520ad3d350c876daab8523e236c018518c7ec301010200000c02000000a0fab80100000000',
              network: {
                "provider": "https://api.devnet.solana.com"
              },
              params: {
                  recentBlockhash: "4v8su2yidSuisnf6f3E38gWW4DEDUrVkGDW1QkXGW6Ce"
              }
            });
  
            const expectedSerialized = "010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000102194a019e14de7529a91bb5e42c6e8cc8a8bb180558436486a2b8f5dc6f488b1f00000000000000000000000000000000000000000000000000000000000000003a2fc035b32468de100d79849bae7b3a09afc701168aee7fd7cc24a633fe8fcf01010200000c02000000a0fab80100000000"
            expect(response).toHaveProperty('serialized', expectedSerialized);
        });
    });
  });
});
