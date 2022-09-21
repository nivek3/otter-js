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
              expect(response).toHaveProperty('address', 'n1cScasu6XVoDki38WYAJH4ZJGRAfG8XRN');
              done();
            },
          );
        });
      });

      describe('DeploySegwitAccount', () => {
        test('p2wpkh address', (done) => {
          client.DeploySegwitAccount(
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
              expect(response).toHaveProperty('address', 'tb1qm3krcsl96tyngcpqj5gr609lsnwu09ljvgpqlw');
              done();
            },
          );
        });
      });

      describe('DeployMultisigLegacyAccount', () => {
        test('generate a 2-of-3 multisig P2SH address, invalid arguments', (done) => {
          client.DeployMultisigLegacyAccount(
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
          client.DeployMultisigLegacyAccount(
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

      describe('DeployMultisigSegwitAccount', () => {
        test('generate a 2-of-3 multisig p2wsh-p2ms address', (done) => {
          client.DeployMultisigSegwitAccount(
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
              expect(response).toHaveProperty('address', 'tb1qjal8arqu87q2ez2qny2wemj3jjkexvw2ytp8kwwz7y0dxmk8vwzsn56avk');
              done();
            },
          );
        });
      });

      describe('BuildTransaction', () => {
        test('create a Transaction, with w/ a p2sh input', async () => {
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
                prevOutScript: 'a9144bb4d9e9f96d79d4c1041087fc18b0ac145982e187',
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
                prevOutScript: '76a914dc6c3c43e5d2c934602095103d3cbf84ddc797f288ac',
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

        test('create a Transaction, with w/ a P2WPKH input', async () => {
          const req = {
            changer: 'tb1qfuusuh5xq4gdu275uf3kpgrxv6echkzqvrseqz',
            recipients: [
              {
                address: 'tb1qfuusuh5xq4gdu275uf3kpgrxv6echkzqvrseqz',
                value: '9800',
              },
            ],
            utxos: [
              {
                vout: 1,
                txid: '657aa5a20e0b8d31b713c766ab6cea88a569c0786e6eba26f99416b9c4fc2a7d',
                amount: '10000',
                prevOutScript: '00144f390e5e860550de2bd4e26360a06666b38bd840',
                signers: ['02f44bce3eecd274e7aa24ec975388d12905dfc670a99b16e1d968e6ab5f69b266'],
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
          const { serialized, signatures } = await BuildTransaction(req);
          expect(serialized).toEqual(
            '01000000017d2afcc4b91694f926ba6e6e78c069a588ea6cab66c713b7318d0b0ea2a57a650100000000ffffffff0148260000000000001600144f390e5e860550de2bd4e26360a06666b38bd84000000000',
          );
          expect(signatures).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                pubKey: '02f44bce3eecd274e7aa24ec975388d12905dfc670a99b16e1d968e6ab5f69b266',
                hash: 'cb15ddcaa81c925fc7275061107b2ed61ef1f5127e53bc1dd660fab6b3d441e1',
              }),
            ]),
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
                prevOutScript: 'a9144bb4d9e9f96d79d4c1041087fc18b0ac145982e187',
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
                prevOutScript: '76a914dc6c3c43e5d2c934602095103d3cbf84ddc797f288ac',
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

        test('create a Transaction, with w/ a P2WPKH input', async () => {
          const req = {
            utxos: [
              {
                vout: 1,
                txid: '657aa5a20e0b8d31b713c766ab6cea88a569c0786e6eba26f99416b9c4fc2a7d',
                amount: '10000',
                prevOutScript: '00144f390e5e860550de2bd4e26360a06666b38bd840',
                signers: ['02f44bce3eecd274e7aa24ec975388d12905dfc670a99b16e1d968e6ab5f69b266'],
              },
            ],
            serialized:
              '01000000017d2afcc4b91694f926ba6e6e78c069a588ea6cab66c713b7318d0b0ea2a57a650100000000ffffffff0148260000000000001600144f390e5e860550de2bd4e26360a06666b38bd84000000000',
            network: {
              pubKeyHash: '0x6f',
              scriptHash: '0xc4',
              coin: 'btc',
            },
          };
          const HashForSignature = promisify(client.HashForSignature.bind(client));
          const { serialized, signatures } = await HashForSignature(req);
          expect(serialized).toEqual(
            '01000000017d2afcc4b91694f926ba6e6e78c069a588ea6cab66c713b7318d0b0ea2a57a650100000000ffffffff0148260000000000001600144f390e5e860550de2bd4e26360a06666b38bd84000000000',
          );
          expect(signatures).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                pubKey: '02f44bce3eecd274e7aa24ec975388d12905dfc670a99b16e1d968e6ab5f69b266',
                hash: 'cb15ddcaa81c925fc7275061107b2ed61ef1f5127e53bc1dd660fab6b3d441e1',
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
                prevOutScript: 'a9144bb4d9e9f96d79d4c1041087fc18b0ac145982e187',
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
                prevOutScript: '76a914dc6c3c43e5d2c934602095103d3cbf84ddc797f288ac',
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

      // https://blockstream.info/testnet/tx/2ade35290da5406757ff62705f7e78d8d00e49e2b5ddcc370c8cff9544849472
      describe('create a Transaction, with w/ a P2WPKH input.', () => {
        test('build transaction', async () => {
          const req = {
            network: {
              pubKeyHash: '0x6f',
              scriptHash: '0xc4',
              coin: 'btc',
              provider: 'http://btc:btcp@54.254.26.12:18332',
            },
            utxos: [
              {
                amount: '9000',
                signers: ['02f44bce3eecd274e7aa24ec975388d12905dfc670a99b16e1d968e6ab5f69b266'],
                txid: 'a03242d8455bf8960ec9f0d0db554e90cd79ac920cf0eafa24b94f9b92fb99ee',
                vout: 0,
                prevOutScript: '00144f390e5e860550de2bd4e26360a06666b38bd840',
              },
            ],
            params: {
              feeRate: '1',
            },
            changer: 'tb1qfuusuh5xq4gdu275uf3kpgrxv6echkzqvrseqz',
            recipients: [
              {
                address: 'tb1qfuusuh5xq4gdu275uf3kpgrxv6echkzqvrseqz',
                value: '8500',
              },
            ],
          };
          const BuildTransaction = promisify(client.BuildTransaction.bind(client));
          const { serialized, signatures } = await BuildTransaction(req);
          expect(serialized).toEqual(
            '0100000001ee99fb929b4fb924faeaf00c92ac79cd904e55dbd0f0c90e96f85b45d84232a00000000000ffffffff0134210000000000001600144f390e5e860550de2bd4e26360a06666b38bd84000000000',
          );
          expect(signatures).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                pubKey: '02f44bce3eecd274e7aa24ec975388d12905dfc670a99b16e1d968e6ab5f69b266',
                hash: '35916e1e3316a8d29f502e7ccfdde6fa22767139ab1c644321d56fab0c1b4e7e',
              }),
            ]),
          );
        });

        test('sign transaction', async () => {
          const req = {
            utxos: [
              {
                amount: '9000',
                signers: ['02f44bce3eecd274e7aa24ec975388d12905dfc670a99b16e1d968e6ab5f69b266'],
                txid: 'a03242d8455bf8960ec9f0d0db554e90cd79ac920cf0eafa24b94f9b92fb99ee',
                vout: 0,
                prevOutScript: '00144f390e5e860550de2bd4e26360a06666b38bd840',
              },
            ],
            serialized:
              '0100000001ee99fb929b4fb924faeaf00c92ac79cd904e55dbd0f0c90e96f85b45d84232a00000000000ffffffff0134210000000000001600144f390e5e860550de2bd4e26360a06666b38bd84000000000',
            signatures: [
              {
                signature:
                  '7bd00c149470dfc2f64c2fa10e92a5aa3d7f359f50605b063100a043513fb28a605cb5c15f6a3f5e9da456158fb076e8d67c6c555ab5a89954b7ce80db6b8dbb',
                pubKey: '02f44bce3eecd274e7aa24ec975388d12905dfc670a99b16e1d968e6ab5f69b266',
                hash: '35916e1e3316a8d29f502e7ccfdde6fa22767139ab1c644321d56fab0c1b4e7e',
              },
            ],
            network: {
              pubKeyHash: '0x6f',
              scriptHash: '0xc4',
              coin: 'btc',
            },
          };
          const SignTransaction = promisify(client.SignTransaction.bind(client));
          const { serialized, hash } = await SignTransaction(req);
          expect(serialized).toEqual(
            '01000000000101ee99fb929b4fb924faeaf00c92ac79cd904e55dbd0f0c90e96f85b45d84232a00000000000ffffffff0134210000000000001600144f390e5e860550de2bd4e26360a06666b38bd8400247304402207bd00c149470dfc2f64c2fa10e92a5aa3d7f359f50605b063100a043513fb28a0220605cb5c15f6a3f5e9da456158fb076e8d67c6c555ab5a89954b7ce80db6b8dbb012102f44bce3eecd274e7aa24ec975388d12905dfc670a99b16e1d968e6ab5f69b26600000000',
          );
          expect(hash).toEqual('2ade35290da5406757ff62705f7e78d8d00e49e2b5ddcc370c8cff9544849472');
        });
      });

      // https://blockstream.info/testnet/tx/a4fa00f0a2789fc8fb558eaf3246e22ab2f95020677da5b33f854bb30955d58e
      describe('create a Transaction, with w/ a P2WSH-P2MS input.', () => {
        test('build transaction', async () => {
          const req = {
            network: {
              pubKeyHash: '0x6f',
              scriptHash: '0xc4',
              coin: 'btc',
              provider: 'http://btc:btcp@54.254.26.12:18332',
            },
            utxos: [
              {
                amount: '3500',
                signers: [
                  '02f44bce3eecd274e7aa24ec975388d12905dfc670a99b16e1d968e6ab5f69b266',
                  '0377155e520059d3b85c6afc5c617b7eb519afadd0360f1ef03aff3f7e3f5438dd',
                ],
                txid: '512a15c25b459ab0f2e3fcc23ffecadbb1e86297dc9a88fbf721456e79331b68',
                vout: 0,
                prevOutScript: '0020977e7e8c1c3f80ac89409914ecee5194ad9331ca22c27b39c2f11ed36ec76385',
                witnessScript:
                  '522102f4147da97162a214dbe25828ee4c4acc4dc721cd0c15b2761b43ed0292ed82b5210377155e520059d3b85c6afc5c617b7eb519afadd0360f1ef03aff3f7e3f5438dd2102f44bce3eecd274e7aa24ec975388d12905dfc670a99b16e1d968e6ab5f69b26653ae',
              },
            ],
            params: {
              feeRate: '1',
            },
            changer: 'tb1qjal8arqu87q2ez2qny2wemj3jjkexvw2ytp8kwwz7y0dxmk8vwzsn56avk',
            recipients: [
              {
                address: 'tb1qjal8arqu87q2ez2qny2wemj3jjkexvw2ytp8kwwz7y0dxmk8vwzsn56avk',
                value: '3100',
              },
            ],
          };
          const BuildTransaction = promisify(client.BuildTransaction.bind(client));
          const { serialized, signatures } = await BuildTransaction(req);
          expect(serialized).toEqual(
            '0100000001681b33796e4521f7fb889adc9762e8b1dbcafe3fc2fce3f2b09a455bc2152a510000000000ffffffff011c0c000000000000220020977e7e8c1c3f80ac89409914ecee5194ad9331ca22c27b39c2f11ed36ec7638500000000',
          );
          expect(signatures).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                pubKey: '02f44bce3eecd274e7aa24ec975388d12905dfc670a99b16e1d968e6ab5f69b266',
                hash: '9749dd17c06ed705465bec409ad4f24dc9839eec9a91c8fdb671154a20a42383',
              }),
              expect.objectContaining({
                pubKey: '0377155e520059d3b85c6afc5c617b7eb519afadd0360f1ef03aff3f7e3f5438dd',
                hash: '9749dd17c06ed705465bec409ad4f24dc9839eec9a91c8fdb671154a20a42383',
              }),
            ]),
          );
        });

        test('sign transaction', async () => {
          const req = {
            network: {
              pubKeyHash: '0x6f',
              scriptHash: '0xc4',
              coin: 'btc',
            },
            utxos: [
              {
                amount: '3500',
                signers: [
                  '02f44bce3eecd274e7aa24ec975388d12905dfc670a99b16e1d968e6ab5f69b266',
                  '0377155e520059d3b85c6afc5c617b7eb519afadd0360f1ef03aff3f7e3f5438dd',
                ],
                txid: '512a15c25b459ab0f2e3fcc23ffecadbb1e86297dc9a88fbf721456e79331b68',
                vout: 0,
                prevOutScript: '0020977e7e8c1c3f80ac89409914ecee5194ad9331ca22c27b39c2f11ed36ec76385',
                witnessScript:
                  '522102f4147da97162a214dbe25828ee4c4acc4dc721cd0c15b2761b43ed0292ed82b5210377155e520059d3b85c6afc5c617b7eb519afadd0360f1ef03aff3f7e3f5438dd2102f44bce3eecd274e7aa24ec975388d12905dfc670a99b16e1d968e6ab5f69b26653ae',
              },
            ],
            serialized:
              '0100000001681b33796e4521f7fb889adc9762e8b1dbcafe3fc2fce3f2b09a455bc2152a510000000000ffffffff011c0c000000000000220020977e7e8c1c3f80ac89409914ecee5194ad9331ca22c27b39c2f11ed36ec7638500000000',
            signatures: [
              {
                pubKey: '02f44bce3eecd274e7aa24ec975388d12905dfc670a99b16e1d968e6ab5f69b266',
                hash: '9749dd17c06ed705465bec409ad4f24dc9839eec9a91c8fdb671154a20a42383',
                signature:
                  '13c7e987a1ee2c90b11fc14fc96725df1020294ae3cd9de2570e2126a215eae326ce9a65f8496fa92e584eba06b16d079eacbe47bfd836f05f1e7572f05ca34201',
              },
              {
                pubKey: '0377155e520059d3b85c6afc5c617b7eb519afadd0360f1ef03aff3f7e3f5438dd',
                hash: '9749dd17c06ed705465bec409ad4f24dc9839eec9a91c8fdb671154a20a42383',
                signature:
                  '7f7a65db46b61e4f78fd6231ad6b99c17eb341ac83c7d26a6cf09b3c6d7b3233b48747de0c5be5ae786e89337bdae7818c9c0be27d12bdf9d6fb93381721b23801',
              },
            ],
          };
          const SignTransaction = promisify(client.SignTransaction.bind(client));
          const { serialized, hash } = await SignTransaction(req);
          expect(serialized).toEqual(
            '01000000000101681b33796e4521f7fb889adc9762e8b1dbcafe3fc2fce3f2b09a455bc2152a510000000000ffffffff011c0c000000000000220020977e7e8c1c3f80ac89409914ecee5194ad9331ca22c27b39c2f11ed36ec76385040047304402207f7a65db46b61e4f78fd6231ad6b99c17eb341ac83c7d26a6cf09b3c6d7b323302204b78b821f3a41a51879176cc8425187d2e12d1043235e241e8d6cb54b9148f0901473044022013c7e987a1ee2c90b11fc14fc96725df1020294ae3cd9de2570e2126a215eae3022026ce9a65f8496fa92e584eba06b16d079eacbe47bfd836f05f1e7572f05ca3420169522102f4147da97162a214dbe25828ee4c4acc4dc721cd0c15b2761b43ed0292ed82b5210377155e520059d3b85c6afc5c617b7eb519afadd0360f1ef03aff3f7e3f5438dd2102f44bce3eecd274e7aa24ec975388d12905dfc670a99b16e1d968e6ab5f69b26653ae00000000',
          );
          expect(hash).toEqual('a4fa00f0a2789fc8fb558eaf3246e22ab2f95020677da5b33f854bb30955d58e');
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

      describe('DeployMultisigLegacyAccount', () => {
        test('generate a 2-of-3 multisig P2SH address, expect valid address', (done) => {
          client.DeployMultisigLegacyAccount(
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

      describe('DecodeRawTransaction', () => {
        test('mainnet', async () => {
          const req = {
            network: {
              pubKeyHash: '0x00',
              scriptHash: '0x05',
              coin: 'btc',
            },
            serialized:
              '020000000112d211b907a50e44665ca8c68024ba7483749bccdaff7195207e536fe3678844170000006b483045022100cc85fa69314666d739aef9598bd5e2efb8b81f0ee8e34b8ff0708563d0c13d48022019656ca1053a6b2659bbb0680eaa854cc77807285826a6dd2a82825189b1e48b012102ca1e3ea0c6d1af43842309efb297446380fb55c8ba4868f043d2e32dd758efbdffffffff016a7103000000000017a914fc178a85f2824eb8a4f86550c90d03099ae354cf8700000000',
          };

          const Method = promisify(client.DecodeRawTransaction.bind(client));

          const decoded = await Method(req);

          expect(decoded).toEqual(
            expect.objectContaining({
              txid: 'bc2dcfc7f9fa625bc9706faf3c8bce60a5cc9e5ff40cb075e5e1647ad061a95e',
              hash: 'bc2dcfc7f9fa625bc9706faf3c8bce60a5cc9e5ff40cb075e5e1647ad061a95e',
              version: 2,
              size: 190,
              vsize: 190,
              weight: 760,
              locktime: 0,
            }),
          );
          expect(decoded.vin).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                txid: '448867e36f537e209571ffdacc9b748374ba2480c6a85c66440ea507b911d212',
                vout: 23,
                scriptSig: {
                  asm: '3045022100cc85fa69314666d739aef9598bd5e2efb8b81f0ee8e34b8ff0708563d0c13d48022019656ca1053a6b2659bbb0680eaa854cc77807285826a6dd2a82825189b1e48b01 02ca1e3ea0c6d1af43842309efb297446380fb55c8ba4868f043d2e32dd758efbd',
                  hex: '483045022100cc85fa69314666d739aef9598bd5e2efb8b81f0ee8e34b8ff0708563d0c13d48022019656ca1053a6b2659bbb0680eaa854cc77807285826a6dd2a82825189b1e48b012102ca1e3ea0c6d1af43842309efb297446380fb55c8ba4868f043d2e32dd758efbd',
                },
                sequence: '4294967295',
              }),
            ]),
          );
        });
      });
    });
  });
});
