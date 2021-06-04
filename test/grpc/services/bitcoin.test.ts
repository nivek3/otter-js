import 'dotenv/config';
import path from 'path';
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
let client: any;

describe('BitCoin service', () => {
  describe('BuildAccount', () => {
    beforeEach(async () => {
      await grpcServer.start();
      client = new BitCoin(`localhost:${process.env.GRPC_PORT}`, grpc.credentials.createInsecure());
    });

    afterEach(async () => {
      client?.close();
      await grpcServer.stop();
      jest.resetAllMocks();
    });

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

    test('generate a 2-of-3 multisig P2SH address, expect valid address', (done) => {
      const address = '2Mz9XKSAiCsRmgnS7xmkqLJTCuGVz7TB3dL';
      client.DeployAccount(
        {
          keys: [
            '02f4147da97162a214dbe25828ee4c4acc4dc721cd0c15b2761b43ed0292ed82b5',
            '0377155e520059d3b85c6afc5c617b7eb519afadd0360f1ef03aff3f7e3f5438dd',
            '02f44bce3eecd274e7aa24ec975388d12905dfc670a99b16e1d968e6ab5f69b266',
          ],
          requiredConfirmations: 2,
          network: {
            pubKeyHash: '0x6f',
            scriptHash: '0xc4',
            coin: 'btc',
          },
        },
        (err: grpc.ServiceError, response) => {
          expect(err.code).toBe(grpc.status.INVALID_ARGUMENT);
          expect(response).toHaveProperty('address', address);
          expect(err.details).toBeDefined();
          expect(response).toBeUndefined();
          done();
        },
      );
    });
  });
});
