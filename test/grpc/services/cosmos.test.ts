import 'dotenv/config';
import path from 'path';
import { promisify } from 'util';

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { grpcServer } from '../../../src/services/grpc';
import { provider } from '../../../src/providers/chain-state/cosmos';

const PROTO_PATH = path.join(__dirname, '../../../proto/cosmos.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  longs: String,
  defaults: false,
  oneofs: true,
});
const Cosmos = (grpc.loadPackageDefinition(packageDefinition) as any)?.cosmos.Cosmos;
let client;

describe('Cosmos service', () => {
  beforeAll(async () => {
    await grpcServer.start();
    client = new Cosmos(`localhost:${process.env.GRPC_PORT}`, grpc.credentials.createInsecure());
  });

  afterAll(async () => {
    client?.close();
    await grpcServer.stop();
  });

  describe('Cosmos', () => {
    test('DeployAccount', async () => {
      const DeployAccount = promisify(client.DeployAccount.bind(client));
      const { address } = await DeployAccount({
        key: '025802f6b064ae8cd15053422905d304817c3418eb4e79f813e508127a8fc497c9',
        network: {
          bech32Prefix: 'cosmos',
        },
      });
      expect(address).toEqual('cosmos14hm24e5wepv5qh5ny2lc50v2hu7fy9gklcd07w');
    });

    test('BuildTransferTransaction', async () => {
      const api = await provider.getReqProvider('https://rpc.testnet.cosmos.network:443');

      jest.spyOn(provider, 'getReqProvider').mockResolvedValueOnce(api);
      jest.spyOn(api, 'getAccount').mockResolvedValueOnce({
        accountNumber: 625,
        sequence: 5,
      } as any);

      const BuildTransferTransaction = promisify(client.BuildTransferTransaction.bind(client));
      const { serialized, signatures } = await BuildTransferTransaction({
        network: {
          bech32Prefix: 'cosmos',
          provider: 'https://rpc.testnet.cosmos.network:443',
          chainId: 'cosmoshub-testnet',
        },
        to: 'cosmos1xv9tklw7d82sezh9haa573wufgy59vmwe6xxe5',
        amount: {
          amount: '1234567',
          denom: 'uphoton',
        },
        from: 'cosmos14hm24e5wepv5qh5ny2lc50v2hu7fy9gklcd07w',
        params: {
          fee: {
            amount: {
              amount: '2000',
              denom: 'uphoton',
            },
            gas: '80000',
          },
          accountNumber: 625,
          sequence: 5,
          pubKey: '025802f6b064ae8cd15053422905d304817c3418eb4e79f813e508127a8fc497c9',
        },
      });
      expect(serialized).toEqual(
        '0a95010a92010a1c2f636f736d6f732e62616e6b2e763162657461312e4d736753656e6412720a2d636f736d6f733134686d3234653577657076357168356e79326c6335307632687537667939676b6c6364303777122d636f736d6f7331787639746b6c773764383273657a683968616135373377756667793539766d776536787865351a120a077570686f746f6e12073132333435363712690a500a460a1f2f636f736d6f732e63727970746f2e736563703235366b312e5075624b657912230a21025802f6b064ae8cd15053422905d304817c3418eb4e79f813e508127a8fc497c912040a020801180512150a0f0a077570686f746f6e1204323030301080f104',
      );
      expect(signatures).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            hash: 'aca47e70522cb75aa0756a4d10ec572373f0eccdb64fa60307632539735c7bca',
          }),
        ]),
      );
    });

    test('SignTransaction', async () => {
      const SignTransaction = promisify(client.SignTransaction.bind(client));
      const { serialized, hash } = await SignTransaction({
        serialized:
          '0a95010a92010a1c2f636f736d6f732e62616e6b2e763162657461312e4d736753656e6412720a2d636f736d6f733134686d3234653577657076357168356e79326c6335307632687537667939676b6c6364303777122d636f736d6f7331787639746b6c773764383273657a683968616135373377756667793539766d776536787865351a120a077570686f746f6e12073132333435363712690a500a460a1f2f636f736d6f732e63727970746f2e736563703235366b312e5075624b657912230a21025802f6b064ae8cd15053422905d304817c3418eb4e79f813e508127a8fc497c912040a020801180512150a0f0a077570686f746f6e1204323030301080f104',
        signatures: [
          {
            signature:
              '19b9bfc360c646413e5068c49b6f98ea7f47dbd76a443d1f1f0557ef3eb6acf779942a63bd21d29adc3ec0cce764232bcf92aafb5b2a92159c2cc99f33a310f5',
          },
        ],
      });
      expect(hash).toEqual('58BF5B1C8E0FD9591F7022236C3D74C5D6FA8D37A8E413A588C9B968C70BE963');
      expect(serialized).toEqual(
        '0a95010a92010a1c2f636f736d6f732e62616e6b2e763162657461312e4d736753656e6412720a2d636f736d6f733134686d3234653577657076357168356e79326c6335307632687537667939676b6c6364303777122d636f736d6f7331787639746b6c773764383273657a683968616135373377756667793539766d776536787865351a120a077570686f746f6e12073132333435363712690a500a460a1f2f636f736d6f732e63727970746f2e736563703235366b312e5075624b657912230a21025802f6b064ae8cd15053422905d304817c3418eb4e79f813e508127a8fc497c912040a020801180512150a0f0a077570686f746f6e1204323030301080f1041a4019b9bfc360c646413e5068c49b6f98ea7f47dbd76a443d1f1f0557ef3eb6acf779942a63bd21d29adc3ec0cce764232bcf92aafb5b2a92159c2cc99f33a310f5',
      );
    });

    test('DecodeTransaction', async () => {
      const DecodeTransaction = promisify(client.DecodeTransaction.bind(client));
      const params = await DecodeTransaction({
        serialized:
          '0a95010a92010a1c2f636f736d6f732e62616e6b2e763162657461312e4d736753656e6412720a2d636f736d6f733134686d3234653577657076357168356e79326c6335307632687537667939676b6c6364303777122d636f736d6f7331787639746b6c773764383273657a683968616135373377756667793539766d776536787865351a120a077570686f746f6e12073132333435363712690a500a460a1f2f636f736d6f732e63727970746f2e736563703235366b312e5075624b657912230a21025802f6b064ae8cd15053422905d304817c3418eb4e79f813e508127a8fc497c912040a020801180512150a0f0a077570686f746f6e1204323030301080f1041a4019b9bfc360c646413e5068c49b6f98ea7f47dbd76a443d1f1f0557ef3eb6acf779942a63bd21d29adc3ec0cce764232bcf92aafb5b2a92159c2cc99f33a310f5',
      });
      expect(params).toEqual(
        expect.objectContaining({
          sequence: 5,
          fee: {
            gas: '80000',
            amount: {
              denom: 'uphoton',
              amount: '2000',
            },
          },
        }),
      );
    });

    test('RebuildTransaction', async () => {
      const RebuildTransaction = promisify(client.RebuildTransaction.bind(client));
      const { serialized, signatures } = await RebuildTransaction({
        network: {
          bech32Prefix: 'cosmos',
          provider: 'https://rpc.testnet.cosmos.network:443',
          chainId: 'cosmoshub-testnet',
        },
        serialized:
          '0a95010a92010a1c2f636f736d6f732e62616e6b2e763162657461312e4d736753656e6412720a2d636f736d6f733134686d3234653577657076357168356e79326c6335307632687537667939676b6c6364303777122d636f736d6f7331787639746b6c773764383273657a683968616135373377756667793539766d776536787865351a120a077570686f746f6e12073132333435363712690a500a460a1f2f636f736d6f732e63727970746f2e736563703235366b312e5075624b657912230a21025802f6b064ae8cd15053422905d304817c3418eb4e79f813e508127a8fc497c912040a020801180512150a0f0a077570686f746f6e1204323030301080f1041a4019b9bfc360c646413e5068c49b6f98ea7f47dbd76a443d1f1f0557ef3eb6acf779942a63bd21d29adc3ec0cce764232bcf92aafb5b2a92159c2cc99f33a310f5',
        params: {
          fee: {
            amount: {
              amount: '2000',
              denom: 'uphoton',
            },
            gas: '80000',
          },
          sequence: 7,
        },
      });
      expect(serialized).toEqual(
        '0a95010a92010a1c2f636f736d6f732e62616e6b2e763162657461312e4d736753656e6412720a2d636f736d6f733134686d3234653577657076357168356e79326c6335307632687537667939676b6c6364303777122d636f736d6f7331787639746b6c773764383273657a683968616135373377756667793539766d776536787865351a120a077570686f746f6e12073132333435363712690a500a460a1f2f636f736d6f732e63727970746f2e736563703235366b312e5075624b657912230a21025802f6b064ae8cd15053422905d304817c3418eb4e79f813e508127a8fc497c912040a020801180712150a0f0a077570686f746f6e1204323030301080f104',
      );
      expect(signatures).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            hash: 'f2f978eb40a7d975d5e237cb9520996a14ebaaffccaf680f6e5e42b1932a9f11',
            pubKey: '025802f6b064ae8cd15053422905d304817c3418eb4e79f813e508127a8fc497c9',
          }),
        ]),
      );
    });
  });
});
