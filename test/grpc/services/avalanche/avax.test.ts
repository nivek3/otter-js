import 'dotenv/config';
import path from 'path';
import { promisify } from 'util';

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { grpcServer } from '../../../../src/services/grpc';

const PROTO_PATH = path.join(__dirname, '../../../../proto/avalanche/avax.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  longs: String,
  defaults: false,
  oneofs: true,
});
const Avalanche = (grpc.loadPackageDefinition(packageDefinition) as any)?.avalanche.avax.Avalanche;
let client;

describe('Avalanche service', () => {
  describe('Avalanche', () => {
    beforeAll(async () => {
      await grpcServer.start();
      client = new Avalanche(`localhost:${process.env.GRPC_PORT}`, grpc.credentials.createInsecure());
    });

    afterAll(async () => {
      client?.close();
      await grpcServer.stop();
    });

    describe('DeployAccount', () => {
      test('generate address', async () => {
        const DeployAccount = promisify(client.DeployAccount.bind(client));
        const response = await DeployAccount({
          network: {
            networkId: 5,
          },
          key: '032db3040e7314dc9de4e7bddadcc07fa5ef962eaef687c95aab1894b8a95f84aa',
        });
        expect(response).toHaveProperty('address', 'X-fuji1wngxrrwn665t8xmq93z4dk0y8nne9u44adyhac');
      });
    });

    describe('AVAX Transactions', () => {
      describe('BuildAVAXTransferTransaction', () => {
        test('one utxos', async () => {
          const req = {
            network: {
              networkId: 5,
              provider: 'https://api.avax-test.network/',
            },
            utxos: [
              {
                utxo: '119ddmfJNCFrXuKmjs6teNgMeoFuNkzN2ZGBfYWhHUHnmbat8ZxzehjPjNV4P931cxj3iXtNhU4ka4CbmMECBaVT32waJVMVCkBMQbkyBuDBQaQZyceXNwWdovNfVTznZJWGQeDXqSuVhHnwxU6cxBn4mXLi4ST1Jvb5bn',
                addresses: ['X-fuji1rz6uxnat4e9l6ygdu9enx3a79xnjzg2z4763w2'],
              },
            ],
            change: {
              addresses: ['X-fuji1rz6uxnat4e9l6ygdu9enx3a79xnjzg2z4763w2'],
            },
            recipients: [
              {
                addresses: ['X-fuji1rz6uxnat4e9l6ygdu9enx3a79xnjzg2z4763w2'],
                amount: '1988000000',
              },
            ],
          };
          const BuildAVAXTransferTransaction = promisify(client.BuildAVAXTransferTransaction.bind(client));
          const { serialized, signatures } = await BuildAVAXTransferTransaction(req);
          expect(serialized).toEqual(
            '00000000000000000005ab68eb1ee142a05cfe768c36e11f0b596db5a3c6c77aabe665dad9e638ca94f7000000013d9bdac0ed1d761330cf680efdeb1a42159eb387d6d2950c96f7d28f61bbe2aa0000000700000000767e79000000000000000000000000010000000118b5c34fabae4bfd110de1733347be29a7212142000000013e45dfa47c7328241f25a0a2934d2d71b286c4159a67b06f1d467bf4d963b2c5000000003d9bdac0ed1d761330cf680efdeb1a42159eb387d6d2950c96f7d28f61bbe2aa0000000500000000768dbb40000000010000000000000000',
          );
          expect(signatures).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                hash: 'cf2a3d8acbfc4050a3d72ef70d482c9317a5145a759d88191ef94c1f28857f81',
              }),
            ]),
          );
        });
      });

      describe('SignTransaction', () => {
        test('one utxo', async () => {
          const req = {
            network: {
              networkId: 5,
            },
            serialized:
              '00000000000000000005ab68eb1ee142a05cfe768c36e11f0b596db5a3c6c77aabe665dad9e638ca94f7000000013d9bdac0ed1d761330cf680efdeb1a42159eb387d6d2950c96f7d28f61bbe2aa0000000700000000767e79000000000000000000000000010000000118b5c34fabae4bfd110de1733347be29a7212142000000013e45dfa47c7328241f25a0a2934d2d71b286c4159a67b06f1d467bf4d963b2c5000000003d9bdac0ed1d761330cf680efdeb1a42159eb387d6d2950c96f7d28f61bbe2aa0000000500000000768dbb40000000010000000000000000',
            signatures: [
              {
                pubKey: '03850766aabe2c3483696b154c9cc52a8250316212a7aefe3580d95dd778a5cbc9',
                signature:
                  '7e0a6e2ad24fd74db016ffe46e09b7978268152c191c53f24687a155024bd80d725edce0555e2a4db0adcc3e305c85d926abb616fe4ed12e7eb27e43fb25340200',
              },
            ],
            utxos: [
              {
                utxo: '119ddmfJNCFrXuKmjs6teNgMeoFuNkzN2ZGBfYWhHUHnmbat8ZxzehjPjNV4P931cxj3iXtNhU4ka4CbmMECBaVT32waJVMVCkBMQbkyBuDBQaQZyceXNwWdovNfVTznZJWGQeDXqSuVhHnwxU6cxBn4mXLi4ST1Jvb5bn',
                addresses: ['X-fuji1rz6uxnat4e9l6ygdu9enx3a79xnjzg2z4763w2'],
              },
            ],
          };

          const SignTransaction = promisify(client.SignTransaction.bind(client));

          const { serialized, hash } = await SignTransaction(req);
          expect(serialized).toEqual(
            '00000000000000000005ab68eb1ee142a05cfe768c36e11f0b596db5a3c6c77aabe665dad9e638ca94f7000000013d9bdac0ed1d761330cf680efdeb1a42159eb387d6d2950c96f7d28f61bbe2aa0000000700000000767e79000000000000000000000000010000000118b5c34fabae4bfd110de1733347be29a7212142000000013e45dfa47c7328241f25a0a2934d2d71b286c4159a67b06f1d467bf4d963b2c5000000003d9bdac0ed1d761330cf680efdeb1a42159eb387d6d2950c96f7d28f61bbe2aa0000000500000000768dbb400000000100000000000000000000000100000009000000017e0a6e2ad24fd74db016ffe46e09b7978268152c191c53f24687a155024bd80d725edce0555e2a4db0adcc3e305c85d926abb616fe4ed12e7eb27e43fb25340200',
          );
          expect(hash).toEqual('fxL6RAnznqXefGiuCXBLbpnRYbdeuSbbtMdHZqcKfYLVePeRK');
        });
      });

      describe('DecodeTransaction', () => {
        test('one utxo', async () => {
          const req = {
            network: {
              networkId: 5,
              provider: 'https://api.avax-test.network/',
            },
            serialized:
              '00000000000000000005ab68eb1ee142a05cfe768c36e11f0b596db5a3c6c77aabe665dad9e638ca94f7000000013d9bdac0ed1d761330cf680efdeb1a42159eb387d6d2950c96f7d28f61bbe2aa0000000700000000767e79000000000000000000000000010000000118b5c34fabae4bfd110de1733347be29a7212142000000013e45dfa47c7328241f25a0a2934d2d71b286c4159a67b06f1d467bf4d963b2c5000000003d9bdac0ed1d761330cf680efdeb1a42159eb387d6d2950c96f7d28f61bbe2aa0000000500000000768dbb400000000100000000000000000000000100000009000000017e0a6e2ad24fd74db016ffe46e09b7978268152c191c53f24687a155024bd80d725edce0555e2a4db0adcc3e305c85d926abb616fe4ed12e7eb27e43fb25340200',
          };

          const DecodeTransaction = promisify(client.DecodeTransaction.bind(client));

          const response = await DecodeTransaction(req);

          expect(response).toEqual(
            expect.objectContaining({
              fee: '1000000',
              memo: '',
            }),
          );
        });
      });
    });
  });
});
