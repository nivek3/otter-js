import 'dotenv/config';
import path from 'path';
import { promisify } from 'util';

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { grpcServer } from '@src/services/grpc';

const PROTO_PATH = path.join(__dirname, '../../../proto/bitcoin.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  longs: String,
  defaults: false,
  oneofs: true,
});
const Bitcoin = (grpc.loadPackageDefinition(packageDefinition) as any)?.bitcoin.Bitcoin;
let client;

describe('Bitcoin service', () => {
  describe('Bitcoin', () => {
    beforeAll(async () => {
      await grpcServer.start();
      client = new Bitcoin(`localhost:${process.env.GRPC_PORT}`, grpc.credentials.createInsecure());
    });

    afterAll(async () => {
      client?.close();
      await grpcServer.stop();
    });

    describe('Bitcoin testnet', () => {
      describe('DeployAccount', () => {
        test('generate address', (done) => {
          const address = 'n1cScasu6XVoDki38WYAJH4ZJGRAfG8XRN';
          client.DeployAccount(
            {
              key: '02ff26c5980685ae12d25312a8df8224c951a68272013425ffa60327d7d4b54231',
              network: {
                pubKeyHash: '0x6f',
                scriptHash: '0xc4',
                coin: 'btc',
              },
            },
            (err: grpc.ServiceError, response) => {
              expect(err).toBeNull();
              expect(response).toHaveProperty('address', address);
              done();
            },
          );
        });
      });

      describe('DeployMultisigAccount', () => {
        test('generate a 2-of-3 multisig P2SH address, invalid arguments', (done) => {
          client.DeployMultisigAccount(
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
          client.DeployMultisigAccount(
            {
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
            },
            (_err: grpc.ServiceError, response) => {
              expect(response).toHaveProperty('address', address);
              done();
            },
          );
        });
      });

      describe('BuildTransaction', () => {
        test('multi utxos', async () => {
          const req = {
            changer: '2Mz9XKSAiCsRmgnS7xmkqLJTCuGVz7TB3dL',
            recipients: [
              {
                address: '2Mz9XKSAiCsRmgnS7xmkqLJTCuGVz7TB3dL',
                value: '13000',
              },
            ],
            utxos: [
              {
                vout: 1,
                txid: 'fd9b44753db382c410aaf63778aba38a51c43825b21aa5a230148b3fb20d1322',
                amount: '10000',
                scriptPubKey: 'a9144bb4d9e9f96d79d4c1041087fc18b0ac145982e187',
                redeemScript:
                  '522102f4147da97162a214dbe25828ee4c4acc4dc721cd0c15b2761b43ed0292ed82b5210377155e520059d3b85c6afc5c617b7eb519afadd0360f1ef03aff3f7e3f5438dd2102f44bce3eecd274e7aa24ec975388d12905dfc670a99b16e1d968e6ab5f69b26653ae',
                signers: [
                  '02f4147da97162a214dbe25828ee4c4acc4dc721cd0c15b2761b43ed0292ed82b5',
                  '0377155e520059d3b85c6afc5c617b7eb519afadd0360f1ef03aff3f7e3f5438dd',
                ],
              },
              {
                vout: 0,
                txid: 'b779a919a3f6c4f8b2730cc497626c4703b5d99e9676ca937115ebcbcdcbddd8',
                amount: '10000',
                scriptPubKey: '76a914dc6c3c43e5d2c934602095103d3cbf84ddc797f288ac',
                signers: ['02ff26c5980685ae12d25312a8df8224c951a68272013425ffa60327d7d4b54231'],
              },
            ],
            params: {
              feeRate: 1,
            },
            network: {
              pubKeyHash: '0x6f',
              scriptHash: '0xc4',
              coin: 'btc',
            },
          };
          const BuildTransaction = promisify(client.BuildTransaction.bind(client));
          const { serialized } = await BuildTransaction(req);
          expect(serialized).toEqual(
            '010000000222130db23f8b1430a2a51ab22538c4518aa3ab7837f6aa10c482b33d75449bfd0100000000ffffffffd8ddcbcdcbeb157193ca76969ed9b503476c6297c40c73b2f8c4f6a319a979b70000000000ffffffff02c83200000000000017a9144bb4d9e9f96d79d4c1041087fc18b0ac145982e187fb1800000000000017a9144bb4d9e9f96d79d4c1041087fc18b0ac145982e18700000000',
          );
        });
      });

      describe('HashForSignature', () => {
        test('multi utxos', async () => {
          const req = {
            utxos: [
              {
                vout: 1,
                txid: 'fd9b44753db382c410aaf63778aba38a51c43825b21aa5a230148b3fb20d1322',
                amount: '10000',
                script: 'a9144bb4d9e9f96d79d4c1041087fc18b0ac145982e187',
                redeemScript:
                  '522102f4147da97162a214dbe25828ee4c4acc4dc721cd0c15b2761b43ed0292ed82b5210377155e520059d3b85c6afc5c617b7eb519afadd0360f1ef03aff3f7e3f5438dd2102f44bce3eecd274e7aa24ec975388d12905dfc670a99b16e1d968e6ab5f69b26653ae',
                signers: [
                  '02f4147da97162a214dbe25828ee4c4acc4dc721cd0c15b2761b43ed0292ed82b5',
                  '0377155e520059d3b85c6afc5c617b7eb519afadd0360f1ef03aff3f7e3f5438dd',
                ],
              },
              {
                vout: 0,
                txid: 'b779a919a3f6c4f8b2730cc497626c4703b5d99e9676ca937115ebcbcdcbddd8',
                amount: '10000',
                script: '76a914dc6c3c43e5d2c934602095103d3cbf84ddc797f288ac',
                signers: ['02ff26c5980685ae12d25312a8df8224c951a68272013425ffa60327d7d4b54231'],
              },
            ],
            serialized:
              '010000000222130db23f8b1430a2a51ab22538c4518aa3ab7837f6aa10c482b33d75449bfd0100000000ffffffffd8ddcbcdcbeb157193ca76969ed9b503476c6297c40c73b2f8c4f6a319a979b70000000000ffffffff02c83200000000000017a9144bb4d9e9f96d79d4c1041087fc18b0ac145982e187581b00000000000017a9144bb4d9e9f96d79d4c1041087fc18b0ac145982e18700000000',
            network: {
              pubKeyHash: '0x6f',
              scriptHash: '0xc4',
              coin: 'btc',
            },
          };

          const HashForSignature = promisify(client.HashForSignature.bind(client));
          const { serialized, signatures, estimatedFee } = await HashForSignature(req);
          expect(serialized).toEqual(
            '010000000222130db23f8b1430a2a51ab22538c4518aa3ab7837f6aa10c482b33d75449bfd0100000000ffffffffd8ddcbcdcbeb157193ca76969ed9b503476c6297c40c73b2f8c4f6a319a979b70000000000ffffffff02c83200000000000017a9144bb4d9e9f96d79d4c1041087fc18b0ac145982e187581b00000000000017a9144bb4d9e9f96d79d4c1041087fc18b0ac145982e18700000000',
          );
          expect(estimatedFee).toEqual('0');
          expect(signatures).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                pubKey: '02f4147da97162a214dbe25828ee4c4acc4dc721cd0c15b2761b43ed0292ed82b5',
                hash: '5d7e57fd02edcb9d8b31e711d0a38c1c31a3403158d617ca6589773a057b053f',
              }),
              expect.objectContaining({
                pubKey: '0377155e520059d3b85c6afc5c617b7eb519afadd0360f1ef03aff3f7e3f5438dd',
                hash: '5d7e57fd02edcb9d8b31e711d0a38c1c31a3403158d617ca6589773a057b053f',
              }),
              expect.objectContaining({
                pubKey: '02ff26c5980685ae12d25312a8df8224c951a68272013425ffa60327d7d4b54231',
                hash: '53ef79ac4212fb3d6ee4d224f8699fe38f0273320cbadd5e038b48a9f23d73af',
              }),
            ]),
          );
        });
      });

      describe('SignTransaction', () => {
        test('signature', async () => {
          const req = {
            utxos: [
              {
                vout: 1,
                txid: 'fd9b44753db382c410aaf63778aba38a51c43825b21aa5a230148b3fb20d1322',
                amount: '10000',
                script: 'a9144bb4d9e9f96d79d4c1041087fc18b0ac145982e187',
                redeemScript:
                  '522102f4147da97162a214dbe25828ee4c4acc4dc721cd0c15b2761b43ed0292ed82b5210377155e520059d3b85c6afc5c617b7eb519afadd0360f1ef03aff3f7e3f5438dd2102f44bce3eecd274e7aa24ec975388d12905dfc670a99b16e1d968e6ab5f69b26653ae',
                signers: [
                  '02f4147da97162a214dbe25828ee4c4acc4dc721cd0c15b2761b43ed0292ed82b5',
                  '0377155e520059d3b85c6afc5c617b7eb519afadd0360f1ef03aff3f7e3f5438dd',
                ],
              },
              {
                vout: 0,
                txid: 'b779a919a3f6c4f8b2730cc497626c4703b5d99e9676ca937115ebcbcdcbddd8',
                amount: '10000',
                script: '76a914dc6c3c43e5d2c934602095103d3cbf84ddc797f288ac',
                signers: ['02ff26c5980685ae12d25312a8df8224c951a68272013425ffa60327d7d4b54231'],
              },
            ],
            serialized:
              '010000000222130db23f8b1430a2a51ab22538c4518aa3ab7837f6aa10c482b33d75449bfd0100000000ffffffffd8ddcbcdcbeb157193ca76969ed9b503476c6297c40c73b2f8c4f6a319a979b70000000000ffffffff02c83200000000000017a9144bb4d9e9f96d79d4c1041087fc18b0ac145982e187581b00000000000017a9144bb4d9e9f96d79d4c1041087fc18b0ac145982e18700000000',
            signatures: [
              {
                signature:
                  'b55cd0a2721d850a064bab91b1fabc85cd84214c539d7a70cc32504bd4e793e44ab7684b4daae0aa0ea12789c848d8daf0b35ffe477370e13ed62a224114978a',
                pubKey: '02f4147da97162a214dbe25828ee4c4acc4dc721cd0c15b2761b43ed0292ed82b5',
                hash: '5d7e57fd02edcb9d8b31e711d0a38c1c31a3403158d617ca6589773a057b053f',
              },
              {
                signature:
                  '848a041a9172d9de0f8c7097ba0da143b2073ddc564eec6c7d4e628e8e4b53ab23a7aa0da73bf3328d0d6dbfc76a4bbd4a4a8a97f127db99f86383d7fcafa287',
                pubKey: '0377155e520059d3b85c6afc5c617b7eb519afadd0360f1ef03aff3f7e3f5438dd',
                hash: '5d7e57fd02edcb9d8b31e711d0a38c1c31a3403158d617ca6589773a057b053f',
              },
              {
                signature:
                  '4dec81ebbc7e4983d657eeab7a50cd533e950be7e8689e3f7fb713efd6aeac3626a8d9862b703c47f2227c3ad58f9682c0ef89b0f37cc48ae2db9828f7026d59',
                pubKey: '02ff26c5980685ae12d25312a8df8224c951a68272013425ffa60327d7d4b54231',
                hash: '53ef79ac4212fb3d6ee4d224f8699fe38f0273320cbadd5e038b48a9f23d73af',
              },
            ],
            network: {
              pubKeyHash: '0x6f',
              scriptHash: '0xc4',
              coin: 'btc',
            },
          };

          const SignTransaction = promisify(client.SignTransaction.bind(client));

          const { serialized, hash, estimatedFee } = await SignTransaction(req);
          expect(estimatedFee).toEqual('0');
          expect(serialized).toEqual(
            '010000000222130db23f8b1430a2a51ab22538c4518aa3ab7837f6aa10c482b33d75449bfd01000000fdfe0000483045022100b55cd0a2721d850a064bab91b1fabc85cd84214c539d7a70cc32504bd4e793e402204ab7684b4daae0aa0ea12789c848d8daf0b35ffe477370e13ed62a224114978a01483045022100848a041a9172d9de0f8c7097ba0da143b2073ddc564eec6c7d4e628e8e4b53ab022023a7aa0da73bf3328d0d6dbfc76a4bbd4a4a8a97f127db99f86383d7fcafa287014c69522102f4147da97162a214dbe25828ee4c4acc4dc721cd0c15b2761b43ed0292ed82b5210377155e520059d3b85c6afc5c617b7eb519afadd0360f1ef03aff3f7e3f5438dd2102f44bce3eecd274e7aa24ec975388d12905dfc670a99b16e1d968e6ab5f69b26653aeffffffffd8ddcbcdcbeb157193ca76969ed9b503476c6297c40c73b2f8c4f6a319a979b7000000006a47304402204dec81ebbc7e4983d657eeab7a50cd533e950be7e8689e3f7fb713efd6aeac36022026a8d9862b703c47f2227c3ad58f9682c0ef89b0f37cc48ae2db9828f7026d59012102ff26c5980685ae12d25312a8df8224c951a68272013425ffa60327d7d4b54231ffffffff02c83200000000000017a9144bb4d9e9f96d79d4c1041087fc18b0ac145982e187581b00000000000017a9144bb4d9e9f96d79d4c1041087fc18b0ac145982e18700000000',
          );
          expect(hash).toEqual('e0d2dc6a0921916b9fcb3954dbb96544b089ae6e81e1342e7599c655b965c351');
        });
      });
    });

    describe('Doge testnet', () => {
      describe('DeployAccount', () => {
        test('DeployAccount', (done) => {
          client.DeployAccount(
            {
              key: '02f44bce3eecd274e7aa24ec975388d12905dfc670a99b16e1d968e6ab5f69b266',
              network: {
                pubKeyHash: '0x71',
                scriptHash: '0xc4',
                coin: 'doge',
                forkChain: 'bitcoin',
              },
            },
            (err: grpc.ServiceError, response) => {
              expect(err).toBeNull();
              expect(response).toHaveProperty('address', 'nbR3zkkjqKUhYxmm1sJkkwzAhjFESTr2X6');
              done();
            },
          );
        });
      });

      describe('DeployMultisigAccount', () => {
        test('generate a 2-of-3 multisig P2SH address, expect valid address', (done) => {
          client.DeployMultisigAccount(
            {
              keys: [
                '02f4147da97162a214dbe25828ee4c4acc4dc721cd0c15b2761b43ed0292ed82b5',
                '0377155e520059d3b85c6afc5c617b7eb519afadd0360f1ef03aff3f7e3f5438dd',
                '02f44bce3eecd274e7aa24ec975388d12905dfc670a99b16e1d968e6ab5f69b266',
              ],
              threshold: 2,
              network: {
                pubKeyHash: '0x71',
                scriptHash: '0xc4',
                coin: 'doge',
                forkChain: 'bitcoin',
              },
            },
            (_err: grpc.ServiceError, response) => {
              expect(response).toHaveProperty('address', '2Mz9XKSAiCsRmgnS7xmkqLJTCuGVz7TB3dL');
              done();
            },
          );
        });
      });

      describe('BuildTransaction', () => {
        test('one utxos', async () => {
          const req = {
            changer: 'nbR3zkkjqKUhYxmm1sJkkwzAhjFESTr2X6',
            recipients: [
              {
                address: 'nbR3zkkjqKUhYxmm1sJkkwzAhjFESTr2X6',
                value: '9900000000',
              },
            ],
            utxos: [
              {
                vout: 0,
                txid: 'd906d600ee12581021f8d13b062dc847bbed4bc22ead409eb3f564fc933de2bf',
                amount: '10000000000',
                signers: ['02f44bce3eecd274e7aa24ec975388d12905dfc670a99b16e1d968e6ab5f69b266'],
              },
            ],
            network: {
              pubKeyHash: '0x71',
              scriptHash: '0xc4',
              coin: 'doge',
              forkChain: 'bitcoin',
            },
            params: {
              feeRate: '55',
            },
          };
          const BuildTransaction = promisify(client.BuildTransaction.bind(client));
          const { serialized, estimatedFee } = await BuildTransaction(req);
          expect(estimatedFee).toEqual('12430');
          expect(serialized).toEqual(
            '0100000001bfe23d93fc64f5b39e40ad2ec24bedbb47c82d063bd1f821105812ee00d606d90000000000ffffffff020003164e020000001976a9144f390e5e860550de2bd4e26360a06666b38bd84088ac72b0f505000000001976a9144f390e5e860550de2bd4e26360a06666b38bd84088ac00000000',
          );
        });
      });

      describe('HashForSignature', () => {
        test('utxo', async () => {
          const req = {
            utxos: [
              {
                vout: 0,
                txid: 'd906d600ee12581021f8d13b062dc847bbed4bc22ead409eb3f564fc933de2bf',
                amount: '10000000000',
                signers: ['02f44bce3eecd274e7aa24ec975388d12905dfc670a99b16e1d968e6ab5f69b266'],
              },
            ],
            network: {
              pubKeyHash: '0x71',
              scriptHash: '0xc4',
              coin: 'doge',
              forkChain: 'bitcoin',
            },
            serialized:
              '0100000001bfe23d93fc64f5b39e40ad2ec24bedbb47c82d063bd1f821105812ee00d606d90000000000ffffffff020003164e020000001976a9144f390e5e860550de2bd4e26360a06666b38bd84088ac72b0f505000000001976a9144f390e5e860550de2bd4e26360a06666b38bd84088ac00000000',
          };

          const HashForSignature = promisify(client.HashForSignature.bind(client));
          const { serialized, signatures, estimatedFee } = await HashForSignature(req);

          expect(estimatedFee).toEqual('12430');
          expect(serialized).toEqual(
            '0100000001bfe23d93fc64f5b39e40ad2ec24bedbb47c82d063bd1f821105812ee00d606d90000000000ffffffff020003164e020000001976a9144f390e5e860550de2bd4e26360a06666b38bd84088ac72b0f505000000001976a9144f390e5e860550de2bd4e26360a06666b38bd84088ac00000000',
          );
          expect(signatures).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                pubKey: '02f44bce3eecd274e7aa24ec975388d12905dfc670a99b16e1d968e6ab5f69b266',
                hash: '1c4d9579f614365d7c45005a429c840e4dcee590dea794bbcd212919b764fbd5',
              }),
            ]),
          );
        });
      });

      describe('SignTransaction', () => {
        test('signature', async () => {
          const req = {
            utxos: [
              {
                vout: 0,
                txid: 'd906d600ee12581021f8d13b062dc847bbed4bc22ead409eb3f564fc933de2bf',
                amount: '10000000000',
                signers: ['02f44bce3eecd274e7aa24ec975388d12905dfc670a99b16e1d968e6ab5f69b266'],
              },
            ],
            network: {
              pubKeyHash: '0x71',
              scriptHash: '0xc4',
              coin: 'doge',
              forkChain: 'bitcoin',
            },
            serialized:
              '0100000001bfe23d93fc64f5b39e40ad2ec24bedbb47c82d063bd1f821105812ee00d606d90000000000ffffffff020003164e020000001976a9144f390e5e860550de2bd4e26360a06666b38bd84088ac72b0f505000000001976a9144f390e5e860550de2bd4e26360a06666b38bd84088ac00000000',
            signatures: [
              {
                signature:
                  'd36d9fbc911d80a7fe503baaddfc67ffbca024cba19fc3891898030dbdf83fa134b5f3c1ca24bb55768d63656f2dbdc74fafb7db6e84f6e3471a65b65e24586e',
                pubKey: '02f44bce3eecd274e7aa24ec975388d12905dfc670a99b16e1d968e6ab5f69b266',
                hash: '1c4d9579f614365d7c45005a429c840e4dcee590dea794bbcd212919b764fbd5',
              },
            ],
          };

          const SignTransaction = promisify(client.SignTransaction.bind(client));

          const { serialized, hash, estimatedFee } = await SignTransaction(req);
          expect(estimatedFee).toEqual('12430');
          expect(serialized).toEqual(
            '0100000001bfe23d93fc64f5b39e40ad2ec24bedbb47c82d063bd1f821105812ee00d606d9000000006b483045022100d36d9fbc911d80a7fe503baaddfc67ffbca024cba19fc3891898030dbdf83fa1022034b5f3c1ca24bb55768d63656f2dbdc74fafb7db6e84f6e3471a65b65e24586e012102f44bce3eecd274e7aa24ec975388d12905dfc670a99b16e1d968e6ab5f69b266ffffffff020003164e020000001976a9144f390e5e860550de2bd4e26360a06666b38bd84088ac72b0f505000000001976a9144f390e5e860550de2bd4e26360a06666b38bd84088ac00000000',
          );
          expect(hash).toEqual('303cd630dda84b89f933e378c590d9d6ffbcd36ccde9a2abaa63130d426b2eba');
        });
      });
    });
  });
});
