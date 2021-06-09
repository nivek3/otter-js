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
          to: '5Gj9zP2Rr7ZTu9RWfSZ8W62tf1kcmsoLYSeX6BqDwUHQKw7j',
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
          '31028400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca4612020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001001000070000ce443b069ff258086572e00ab19b72728b27f810d3535eefd0bae5e4805984c8a10f',
        );
        expect(signatureHashes[0]).toEqual(
          '070000ce443b069ff258086572e00ab19b72728b27f810d3535eefd0bae5e4805984c8a10f0010001100000001000000dd97e5ad3f0015f2dc45c9467b0fd36a2b7f4b9a7bc65e8111d49d6cf19c8927dd97e5ad3f0015f2dc45c9467b0fd36a2b7f4b9a7bc65e8111d49d6cf19c8927',
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
            '31028400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca4612020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001001000070000ce443b069ff258086572e00ab19b72728b27f810d3535eefd0bae5e4805984c8a10f',
          signature: [
            {
              data: '0x020732d882ebd406a8ae8b02a12b53bfb55697545bf20847b3812b61ffe9d0e0c8b614ea1da9689cc2a91a3ef4913938dc2f07307b9fc55d7704bc3785f25ff7b500',
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
          '0x31028400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca4612020732d882ebd406a8ae8b02a12b53bfb55697545bf20847b3812b61ffe9d0e0c8b614ea1da9689cc2a91a3ef4913938dc2f07307b9fc55d7704bc3785f25ff7b500001000070000ce443b069ff258086572e00ab19b72728b27f810d3535eefd0bae5e4805984c8a10f',
        );
      },
      30 * 1000,
    );

    test(
      'build multisig transfer transaction',
      async () => {
        const BuildMultisigTransaction = promisify(client.BuildMultisigTransaction.bind(client));
        const response = await BuildMultisigTransaction({
          pubKeys: [
            '0x0346219571358630cf0565dc9826f4583014a32d2230f04df77b6c2097c2e09624',
            '0x026970416978b59b81347a6764e2891d5f1894cb3c7f03874d77bcd65e8c3f8613',
            '0x020c0ad3825f41eda2c533659a8ce891c0e4fd78e8f1c753fa85992fdfd38236bd',
          ],
          to: '5HhZWYeLNRbpofy4F34vVENgwxQVE8HGWhprVE6MPPCqUdRn',
          quantity: '100000',
          nonce: 45,
          sender: '5HhZWYeLNRbpofy4F34vVENgwxQVE8HGWhprVE6MPPCqUdRn',
          threshold: 2,
          network: {
            wss: 'wss://api.clover.finance',
            ss58Format: 42,
          },
        });
        const { serialized, signatureHashes } = response;
        expect(serialized).toEqual(
          '55038400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca461202000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100b4001d0202000826146dc16221b108d05e7d792e27e3851d15ce1887cf62a9ccea554e43426a53821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaa00bf13d36031407d5ede1415e0e93e16606fffa0f46b70481aded73627b93465c400a0252600000000',
        );
        expect(signatureHashes[0]).toEqual(
          '1d0202000826146dc16221b108d05e7d792e27e3851d15ce1887cf62a9ccea554e43426a53821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaa00bf13d36031407d5ede1415e0e93e16606fffa0f46b70481aded73627b93465c400a025260000000000b4001100000001000000dd97e5ad3f0015f2dc45c9467b0fd36a2b7f4b9a7bc65e8111d49d6cf19c8927dd97e5ad3f0015f2dc45c9467b0fd36a2b7f4b9a7bc65e8111d49d6cf19c8927',
        );
      },
      30 * 1000,
    );
  });
});
