import 'dotenv/config';
import path from 'path';
import { promisify } from 'util';

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { grpcServer } from '../../../src/services/grpc';

const PROTO_PATH = path.join(__dirname, '../../../proto/bitcoin.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  longs: String,
  defaults: false,
  oneofs: true,
});
const BitCoin = (grpc.loadPackageDefinition(packageDefinition) as any)?.bitcoin.BitCoin;
let client;

describe('BitCoin service', () => {
  describe('BuildAccount', () => {
    beforeAll(async () => {
      await grpcServer.start();
      client = new BitCoin(`localhost:${process.env.GRPC_PORT}`, grpc.credentials.createInsecure());
    }, 60 * 1000);

    afterAll(async () => {
      client?.close();
      await grpcServer.stop();
    });

    describe('DeployAccount', () => {
      test('generate a 2-of-3 multisig P2SH address, invalid arguments', (done) => {
        client.DeployAccount(
          {
            keys: [
              '02f4147da97162a214dbe25828ee4c4acc4dc721cd0c15b2761b43ed0292ed82b5',
              '0377155e520059d3b85c6afc5c617b7eb519afadd0360f1ef03aff3f7e3f5438dd',
              '02f44bce3eecd274e7aa24ec975388d12905dfc670a99b16e1d968e6ab5f69b266',
            ],
            network: {
              pubKeyHash: '0x6f',
              scriptHash: '0xc4',
              coin: 'btc-not-found',
            },
          },
          (err: grpc.ServiceError, response) => {
            expect(err.code).toBe(grpc.status.INVALID_ARGUMENT);
            expect(err.metadata.getMap()).toHaveProperty('requestid');
            expect(err.details).toBeDefined();
            expect(response).toBeUndefined();
            done();
          },
        );
      });

      test(
        'generate a 2-of-3 multisig P2SH address, expect valid address',
        async () => {
          const address = '2Mz9XKSAiCsRmgnS7xmkqLJTCuGVz7TB3dL';
          const DeployAccount = promisify(client.DeployAccount.bind(client));
          const response = await DeployAccount({
            keys: [
              '02f4147da97162a214dbe25828ee4c4acc4dc721cd0c15b2761b43ed0292ed82b5',
              '0377155e520059d3b85c6afc5c617b7eb519afadd0360f1ef03aff3f7e3f5438dd',
              '02f44bce3eecd274e7aa24ec975388d12905dfc670a99b16e1d968e6ab5f69b266',
            ],
            threshold: 2,
            network: {
              pubKeyHash: '0x6f',
              scriptHash: '0xc4',
              coin: 'btc',
            },
          });
          expect(response).toHaveProperty('address', address);
        },
        30 * 1000,
      );
    });

    describe('BuildTransaction', () => {
      test('one to one', async () => {
        const req = {
          pubKey: '02ff26c5980685ae12d25312a8df8224c951a68272013425ffa60327d7d4b54231',
          changer: 'n1cScasu6XVoDki38WYAJH4ZJGRAfG8XRN',
          recipients: [
            {
              address: 'n1cScasu6XVoDki38WYAJH4ZJGRAfG8XRN',
              value: 1000,
            },
          ],
          utxos: [
            {
              vout: 1,
              txid: '5ab958a2a62d2e905128fbe0faebc998a92abf365aaa8db3f319c280dda32bc1',
              amount: 53084,
            },
          ],
          feeRate: 55,
          network: {
            pubKeyHash: '0x6f',
            scriptHash: '0xc4',
            coin: 'btc',
          },
        };

        const BuildTransaction = promisify(client.BuildTransaction.bind(client));
        const { serialized, signatureHashes = [] } = await BuildTransaction(req);
        expect(serialized).toEqual(
          '0100000001c12ba3dd80c219f3b38daa5a36bf2aa998c9ebfae0fb2851902e2da6a258b95a0100000000ffffffff02e8030000000000001976a914dc6c3c43e5d2c934602095103d3cbf84ddc797f288ace69a0000000000001976a914dc6c3c43e5d2c934602095103d3cbf84ddc797f288ac00000000',
        );

        expect(signatureHashes[0]).toEqual('dac0a47c10092192089a2ba0d31efb39fdf8b63d0f779d15017ea6245c490531');
      });
    });

    describe('SignTransaction', () => {
      test('signature', async () => {
        const req = {
          serialized:
            '0100000001c12ba3dd80c219f3b38daa5a36bf2aa998c9ebfae0fb2851902e2da6a258b95a0100000000ffffffff02e8030000000000001976a914dc6c3c43e5d2c934602095103d3cbf84ddc797f288ace69a0000000000001976a914dc6c3c43e5d2c934602095103d3cbf84ddc797f288ac00000000',
          signature: [
            {
              pubKey: '02ff26c5980685ae12d25312a8df8224c951a68272013425ffa60327d7d4b54231',
              data: 'd788ab2a2c5ff82de907d010ed92560f91bd770c87e1d7c116524d1e65945b5d4d8d93493f9ed5ea2046de1ab8ba57b5416a44acb243469e0673b6e8d4eb37c3',
            },
          ],
          network: {
            pubKeyHash: '0x6f',
            scriptHash: '0xc4',
            coin: 'btc',
          },
        };

        const SignTransaction = promisify(client.SignTransaction.bind(client));
        const { serialized, signatureHashes = [] } = await SignTransaction(req);
        expect(serialized).toEqual(
          '0100000001c12ba3dd80c219f3b38daa5a36bf2aa998c9ebfae0fb2851902e2da6a258b95a010000006b483045022100d788ab2a2c5ff82de907d010ed92560f91bd770c87e1d7c116524d1e65945b5d02204d8d93493f9ed5ea2046de1ab8ba57b5416a44acb243469e0673b6e8d4eb37c3012102ff26c5980685ae12d25312a8df8224c951a68272013425ffa60327d7d4b54231ffffffff02e8030000000000001976a914dc6c3c43e5d2c934602095103d3cbf84ddc797f288ace69a0000000000001976a914dc6c3c43e5d2c934602095103d3cbf84ddc797f288ac00000000',
        );

        expect(signatureHashes[0]).toEqual('');
      });
    });
  });
});
