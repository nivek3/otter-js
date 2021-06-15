import 'dotenv/config';
import path from 'path';
import { promisify } from 'util';

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { grpcServer } from '../../../src/services/grpc';

const PROTO_PATH = path.join(__dirname, '../../../proto/ethereum.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  longs: String,
  defaults: false,
  oneofs: true,
});
const Ethereum = (grpc.loadPackageDefinition(packageDefinition) as any)?.ethereum.Ethereum;
let client;

describe('Ethereum service', () => {
  describe('GRPC service', () => {
    beforeAll(async () => {
      await grpcServer.start();
      client = new Ethereum(`localhost:${process.env.GRPC_PORT}`, grpc.credentials.createInsecure());
    });

    afterAll(async () => {
      client?.close();
      await grpcServer.stop();
    });

    describe('DeployAccount', () => {
      test('generate address from public key', async () => {
        const address = '0x370BA1dc25C07d0C77Ba9b83fcc75Fcc2a0aC243';
        const DeployAccount = promisify(client.DeployAccount.bind(client));
        const response = await DeployAccount({
          key: '02f4147da97162a214dbe25828ee4c4acc4dc721cd0c15b2761b43ed0292ed82b5',
        });
        expect(response).toHaveProperty('address', address);
      });
    });
  });
});
