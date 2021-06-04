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
        requiredConfirmations: 2,
        network: {
          pubKeyHash: '0x6f',
          scriptHash: '0xc4',
          coin: 'btc',
        },
      };

      const address = bitcoinStateProvider.deployAccount(req);
      expect(address).toEqual('2Mz9XKSAiCsRmgnS7xmkqLJTCuGVz7TB3dL');
    });
  });

  describe('BuildTransaction', () => {
    test('one to one', () => {
      const req = {
        pubkey: '02ff26c5980685ae12d25312a8df8224c951a68272013425ffa60327d7d4b54231',
        changer: '2Mz9XKSAiCsRmgnS7xmkqLJTCuGVz7TB3dL',
        targets: [
          {
            address: '2Mz9XKSAiCsRmgnS7xmkqLJTCuGVz7TB3dL',
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

      const { serialized, signatureHashes = [] } = bitcoinStateProvider.buildTransaction(req);
      expect(serialized).toEqual(
        '0100000001c12ba3dd80c219f3b38daa5a36bf2aa998c9ebfae0fb2851902e2da6a258b95a0100000000ffffffff02e80300000000000017a9144bb4d9e9f96d79d4c1041087fc18b0ac145982e187e69a00000000000017a9144bb4d9e9f96d79d4c1041087fc18b0ac145982e18700000000',
      );

      expect(signatureHashes[0]).toEqual('f06dcfd73833e3371746a6207f69602194ab591e5693d1898e221ba2140649c2');
    });
  });

  describe('SignTransaction', () => {
    test('signature', () => {
      const req = {
        serialized:
          '0100000001c12ba3dd80c219f3b38daa5a36bf2aa998c9ebfae0fb2851902e2da6a258b95a0100000000ffffffff02e8030000000000001976a914dc6c3c43e5d2c934602095103d3cbf84ddc797f288ace69a0000000000001976a914dc6c3c43e5d2c934602095103d3cbf84ddc797f288ac00000000',
        signature: [
          {
            pubkey: '02ff26c5980685ae12d25312a8df8224c951a68272013425ffa60327d7d4b54231',
            data: 'd788ab2a2c5ff82de907d010ed92560f91bd770c87e1d7c116524d1e65945b5d4d8d93493f9ed5ea2046de1ab8ba57b5416a44acb243469e0673b6e8d4eb37c3',
          },
        ],
        network: {
          pubKeyHash: '0x6f',
          scriptHash: '0xc4',
          coin: 'btc',
        },
      };

      const { serialized, signatureHashes = [] } = bitcoinStateProvider.signTransaction(req);
      expect(serialized).toEqual(
        '0100000001c12ba3dd80c219f3b38daa5a36bf2aa998c9ebfae0fb2851902e2da6a258b95a010000006b483045022100d788ab2a2c5ff82de907d010ed92560f91bd770c87e1d7c116524d1e65945b5d02204d8d93493f9ed5ea2046de1ab8ba57b5416a44acb243469e0673b6e8d4eb37c3012102ff26c5980685ae12d25312a8df8224c951a68272013425ffa60327d7d4b54231ffffffff02e8030000000000001976a914dc6c3c43e5d2c934602095103d3cbf84ddc797f288ace69a0000000000001976a914dc6c3c43e5d2c934602095103d3cbf84ddc797f288ac00000000',
      );

      expect(signatureHashes[0]).toEqual('');
    });
  });
});
