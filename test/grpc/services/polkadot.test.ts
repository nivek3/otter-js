import 'dotenv/config';
import path from 'path';
import { promisify } from 'util';

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { grpcServer } from '../../../src/services/grpc';

const PROTO_PATH = path.join(__dirname, '../../../proto/polkadot.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  longs: String,
  defaults: false,
  oneofs: true,
});
const Polkadot = (grpc.loadPackageDefinition(packageDefinition) as any)?.polkadot.Polkadot;
let client;

describe('BitCoin service', () => {
  describe('DeployAccount', () => {
    beforeAll(async () => {
      await grpcServer.start();
      client = new Polkadot(`localhost:${process.env.GRPC_PORT}`, grpc.credentials.createInsecure());
    }, 60 * 1000);

    afterAll(async () => {
      client?.close();
      await grpcServer.stop();
    });

    test(
      'generate a 2-of-3 multisig P2SH address, expect valid address',
      async () => {
        const address = '5EjXLmCHWyo5SVTQEo9JBgozVNZgWYheAdENAuEZ1UvaGD3e';
        const DeployAccount = promisify(client.DeployAccount.bind(client));
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
              wss: 'wss://api.clover.finance',
              ss58Format: 42,
            },
          },
        });
        expect(response).toHaveProperty('address', address);
      },
      30 * 1000,
    );

    test(
      'build transfer transaction',
      async () => {
        const BuildTransferTransaction = promisify(client.BuildTransferTransaction.bind(client));
        const response = await BuildTransferTransaction({
          to: '5F1GPrYp5Q32Hr3hczZXoJCTxNhuQxsBbABtSjDnVK9Fn9dZ',
          quantity: '1000',
          from: '5HhZWYeLNRbpofy4F34vVENgwxQVE8HGWhprVE6MPPCqUdRn',
          nonce: 4,
          network: {
            wss: 'wss://api.clover.finance',
            ss58Format: 42,
          },
        });
        const { serialized, signatureHashes } = response;
        expect(serialized).toEqual(
          '2d028400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca46120000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001001000070000821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaaa10f',
        );
        expect(signatureHashes[0]).toEqual(
          '070000821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaaa10f0010001100000001000000dd97e5ad3f0015f2dc45c9467b0fd36a2b7f4b9a7bc65e8111d49d6cf19c8927dd97e5ad3f0015f2dc45c9467b0fd36a2b7f4b9a7bc65e8111d49d6cf19c8927',
        );
      },
      30 * 1000,
    );

    test(
      'replace the tx signature',
      async () => {
        const SignTransaction = promisify(client.SignTransaction.bind(client));
        const response = await SignTransaction({
          serialized:
            '2d028400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca46120000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001001000070000821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaaa10f',
          signature: [
            {
              data: '0x0261d4f7fb6227b6dbc0849dce5971aca1fd8dbea153983c0ed2a87420bef4f0d75a2b27719ea540492876f4d8b204e636d13681a805ed1735af701e7e2c9b555901',
              pubkey: '',
            },
          ],
          network: {
            wss: 'wss://api.clover.finance',
            ss58Format: 42,
          },
        });
        const { serialized } = response;
        expect(serialized).toEqual(
          '0x2d028400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca46120261d4f7fb6227b6dbc0849dce5971aca1fd8dbea153983c0ed2a87420bef4f0d75a2b27719ea540492876f4d8b204e636d13681a805ed1735af701e7e2c9b555901001000070000821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaaa0',
        );
      },
      30 * 1000,
    );
  });
});
