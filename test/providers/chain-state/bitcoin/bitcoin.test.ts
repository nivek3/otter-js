import 'dotenv/config';
import { bitcoinStateProvider } from '../../../../src/providers/chain-state/bitcoin/bitcoin';

describe('ChainStateProvider BitCoin', () => {
  describe('DeployAccount', () => {
    test('testnet', () => {
      const req = {
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
      };

      const address = bitcoinStateProvider.deployMultisigAccount(req);
      expect(address).toEqual('2Mz9XKSAiCsRmgnS7xmkqLJTCuGVz7TB3dL');
    });
  });

  describe('BuildTransaction', () => {
    test('multi utxos', async () => {
      const req = {
        changer: '2Mz9XKSAiCsRmgnS7xmkqLJTCuGVz7TB3dL',
        recipients: [
          {
            address: '2Mz9XKSAiCsRmgnS7xmkqLJTCuGVz7TB3dL',
            value: 13000,
          },
        ],
        utxos: [
          {
            vout: 1,
            txid: 'fd9b44753db382c410aaf63778aba38a51c43825b21aa5a230148b3fb20d1322',
            amount: 10000,
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
            amount: 10000,
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

      const { serialized } = await bitcoinStateProvider.buildTransaction(req);
      expect(serialized).toEqual(
        '010000000222130db23f8b1430a2a51ab22538c4518aa3ab7837f6aa10c482b33d75449bfd0100000000ffffffffd8ddcbcdcbeb157193ca76969ed9b503476c6297c40c73b2f8c4f6a319a979b70000000000ffffffff02c83200000000000017a9144bb4d9e9f96d79d4c1041087fc18b0ac145982e187fb1800000000000017a9144bb4d9e9f96d79d4c1041087fc18b0ac145982e18700000000',
      );
    });
  });

  describe('hashForSignature', () => {
    test('signatures', () => {
      const req = {
        utxos: [
          {
            vout: 1,
            txid: 'fd9b44753db382c410aaf63778aba38a51c43825b21aa5a230148b3fb20d1322',
            amount: 10000,
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
            amount: 10000,
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

      const { serialized, signatures } = bitcoinStateProvider.hashForSignature(req);
      expect(serialized).toEqual(
        '010000000222130db23f8b1430a2a51ab22538c4518aa3ab7837f6aa10c482b33d75449bfd010000006f000000004c69522102f4147da97162a214dbe25828ee4c4acc4dc721cd0c15b2761b43ed0292ed82b5210377155e520059d3b85c6afc5c617b7eb519afadd0360f1ef03aff3f7e3f5438dd2102f44bce3eecd274e7aa24ec975388d12905dfc670a99b16e1d968e6ab5f69b26653aeffffffffd8ddcbcdcbeb157193ca76969ed9b503476c6297c40c73b2f8c4f6a319a979b70000000000ffffffff02c83200000000000017a9144bb4d9e9f96d79d4c1041087fc18b0ac145982e187581b00000000000017a9144bb4d9e9f96d79d4c1041087fc18b0ac145982e18700000000',
      );

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

  describe('signTransaction', () => {
    test('signature with r s', () => {
      const req = {
        utxos: [
          {
            vout: 1,
            txid: 'fd9b44753db382c410aaf63778aba38a51c43825b21aa5a230148b3fb20d1322',
            amount: 10000,
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
            amount: 10000,
            script: '76a914dc6c3c43e5d2c934602095103d3cbf84ddc797f288ac',
            signers: ['02ff26c5980685ae12d25312a8df8224c951a68272013425ffa60327d7d4b54231'],
          },
        ],
        serialized:
          '010000000222130db23f8b1430a2a51ab22538c4518aa3ab7837f6aa10c482b33d75449bfd010000006f000000004c69522102f4147da97162a214dbe25828ee4c4acc4dc721cd0c15b2761b43ed0292ed82b5210377155e520059d3b85c6afc5c617b7eb519afadd0360f1ef03aff3f7e3f5438dd2102f44bce3eecd274e7aa24ec975388d12905dfc670a99b16e1d968e6ab5f69b26653aeffffffffd8ddcbcdcbeb157193ca76969ed9b503476c6297c40c73b2f8c4f6a319a979b70000000000ffffffff02c83200000000000017a9144bb4d9e9f96d79d4c1041087fc18b0ac145982e187581b00000000000017a9144bb4d9e9f96d79d4c1041087fc18b0ac145982e18700000000',
        signatures: [
          {
            signature:
              'b55cd0a2721d850a064bab91b1fabc85cd84214c539d7a70cc32504bd4e793e44ab7684b4daae0aa0ea12789c848d8daf0b35ffe477370e13ed62a224114978a',
            pubKey: '02f4147da97162a214dbe25828ee4c4acc4dc721cd0c15b2761b43ed0292ed82b5',
          },
          {
            signature:
              '848a041a9172d9de0f8c7097ba0da143b2073ddc564eec6c7d4e628e8e4b53ab23a7aa0da73bf3328d0d6dbfc76a4bbd4a4a8a97f127db99f86383d7fcafa287',
            pubKey: '0377155e520059d3b85c6afc5c617b7eb519afadd0360f1ef03aff3f7e3f5438dd',
          },
          {
            signature:
              '4dec81ebbc7e4983d657eeab7a50cd533e950be7e8689e3f7fb713efd6aeac3626a8d9862b703c47f2227c3ad58f9682c0ef89b0f37cc48ae2db9828f7026d59',
            pubKey: '02ff26c5980685ae12d25312a8df8224c951a68272013425ffa60327d7d4b54231',
          },
        ],
        network: {
          pubKeyHash: '0x6f',
          scriptHash: '0xc4',
          coin: 'btc',
        },
      };

      const { serialized } = bitcoinStateProvider.signTransaction(req);
      expect(serialized).toEqual(
        '010000000222130db23f8b1430a2a51ab22538c4518aa3ab7837f6aa10c482b33d75449bfd01000000fdfe0000483045022100b55cd0a2721d850a064bab91b1fabc85cd84214c539d7a70cc32504bd4e793e402204ab7684b4daae0aa0ea12789c848d8daf0b35ffe477370e13ed62a224114978a01483045022100848a041a9172d9de0f8c7097ba0da143b2073ddc564eec6c7d4e628e8e4b53ab022023a7aa0da73bf3328d0d6dbfc76a4bbd4a4a8a97f127db99f86383d7fcafa287014c69522102f4147da97162a214dbe25828ee4c4acc4dc721cd0c15b2761b43ed0292ed82b5210377155e520059d3b85c6afc5c617b7eb519afadd0360f1ef03aff3f7e3f5438dd2102f44bce3eecd274e7aa24ec975388d12905dfc670a99b16e1d968e6ab5f69b26653aeffffffffd8ddcbcdcbeb157193ca76969ed9b503476c6297c40c73b2f8c4f6a319a979b7000000006a47304402204dec81ebbc7e4983d657eeab7a50cd533e950be7e8689e3f7fb713efd6aeac36022026a8d9862b703c47f2227c3ad58f9682c0ef89b0f37cc48ae2db9828f7026d59012102ff26c5980685ae12d25312a8df8224c951a68272013425ffa60327d7d4b54231ffffffff02c83200000000000017a9144bb4d9e9f96d79d4c1041087fc18b0ac145982e187581b00000000000017a9144bb4d9e9f96d79d4c1041087fc18b0ac145982e18700000000',
      );
    });

    test('signature with r s v', () => {
      const req = {
        utxos: [
          {
            vout: 1,
            txid: 'fd9b44753db382c410aaf63778aba38a51c43825b21aa5a230148b3fb20d1322',
            amount: 10000,
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
            amount: 10000,
            script: '76a914dc6c3c43e5d2c934602095103d3cbf84ddc797f288ac',
            signers: ['02ff26c5980685ae12d25312a8df8224c951a68272013425ffa60327d7d4b54231'],
          },
        ],
        serialized:
          '010000000222130db23f8b1430a2a51ab22538c4518aa3ab7837f6aa10c482b33d75449bfd010000006f000000004c69522102f4147da97162a214dbe25828ee4c4acc4dc721cd0c15b2761b43ed0292ed82b5210377155e520059d3b85c6afc5c617b7eb519afadd0360f1ef03aff3f7e3f5438dd2102f44bce3eecd274e7aa24ec975388d12905dfc670a99b16e1d968e6ab5f69b26653aeffffffffd8ddcbcdcbeb157193ca76969ed9b503476c6297c40c73b2f8c4f6a319a979b70000000000ffffffff02c83200000000000017a9144bb4d9e9f96d79d4c1041087fc18b0ac145982e187581b00000000000017a9144bb4d9e9f96d79d4c1041087fc18b0ac145982e18700000000',
        signatures: [
          {
            signature:
              'b55cd0a2721d850a064bab91b1fabc85cd84214c539d7a70cc32504bd4e793e44ab7684b4daae0aa0ea12789c848d8daf0b35ffe477370e13ed62a224114978add',
            pubKey: '02f4147da97162a214dbe25828ee4c4acc4dc721cd0c15b2761b43ed0292ed82b5',
          },
          {
            signature:
              '848a041a9172d9de0f8c7097ba0da143b2073ddc564eec6c7d4e628e8e4b53ab23a7aa0da73bf3328d0d6dbfc76a4bbd4a4a8a97f127db99f86383d7fcafa287',
            pubKey: '0377155e520059d3b85c6afc5c617b7eb519afadd0360f1ef03aff3f7e3f5438dd',
          },
          {
            signature:
              '4dec81ebbc7e4983d657eeab7a50cd533e950be7e8689e3f7fb713efd6aeac3626a8d9862b703c47f2227c3ad58f9682c0ef89b0f37cc48ae2db9828f7026d59dd',
            pubKey: '02ff26c5980685ae12d25312a8df8224c951a68272013425ffa60327d7d4b54231',
          },
        ],
        network: {
          pubKeyHash: '0x6f',
          scriptHash: '0xc4',
          coin: 'btc',
        },
      };

      const { serialized } = bitcoinStateProvider.signTransaction(req);
      expect(serialized).toEqual(
        '010000000222130db23f8b1430a2a51ab22538c4518aa3ab7837f6aa10c482b33d75449bfd01000000fdfe0000483045022100b55cd0a2721d850a064bab91b1fabc85cd84214c539d7a70cc32504bd4e793e402204ab7684b4daae0aa0ea12789c848d8daf0b35ffe477370e13ed62a224114978a01483045022100848a041a9172d9de0f8c7097ba0da143b2073ddc564eec6c7d4e628e8e4b53ab022023a7aa0da73bf3328d0d6dbfc76a4bbd4a4a8a97f127db99f86383d7fcafa287014c69522102f4147da97162a214dbe25828ee4c4acc4dc721cd0c15b2761b43ed0292ed82b5210377155e520059d3b85c6afc5c617b7eb519afadd0360f1ef03aff3f7e3f5438dd2102f44bce3eecd274e7aa24ec975388d12905dfc670a99b16e1d968e6ab5f69b26653aeffffffffd8ddcbcdcbeb157193ca76969ed9b503476c6297c40c73b2f8c4f6a319a979b7000000006a47304402204dec81ebbc7e4983d657eeab7a50cd533e950be7e8689e3f7fb713efd6aeac36022026a8d9862b703c47f2227c3ad58f9682c0ef89b0f37cc48ae2db9828f7026d59012102ff26c5980685ae12d25312a8df8224c951a68272013425ffa60327d7d4b54231ffffffff02c83200000000000017a9144bb4d9e9f96d79d4c1041087fc18b0ac145982e187581b00000000000017a9144bb4d9e9f96d79d4c1041087fc18b0ac145982e18700000000',
      );
    });
  });
});
