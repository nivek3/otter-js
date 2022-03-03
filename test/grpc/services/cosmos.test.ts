import 'dotenv/config';
import path from 'path';
import { promisify } from 'util';

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { grpcServer } from '@src/services/grpc';
import { provider } from '@src/providers/chain-state/cosmos';

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

      const Method = promisify(client.BuildTransferTransaction.bind(client));
      const { serialized, signatures, estimatedFee } = await Method({
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
        pubKey: '025802f6b064ae8cd15053422905d304817c3418eb4e79f813e508127a8fc497c9',
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
        },
      });
      expect(estimatedFee).toEqual('160000000');
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
      const Method = promisify(client.SignTransaction.bind(client));
      const { serialized, hash, estimatedFee } = await Method({
        serialized:
          '0a95010a92010a1c2f636f736d6f732e62616e6b2e763162657461312e4d736753656e6412720a2d636f736d6f733134686d3234653577657076357168356e79326c6335307632687537667939676b6c6364303777122d636f736d6f7331787639746b6c773764383273657a683968616135373377756667793539766d776536787865351a120a077570686f746f6e12073132333435363712690a500a460a1f2f636f736d6f732e63727970746f2e736563703235366b312e5075624b657912230a21025802f6b064ae8cd15053422905d304817c3418eb4e79f813e508127a8fc497c912040a020801180512150a0f0a077570686f746f6e1204323030301080f104',
        signatures: [
          {
            signature:
              '19b9bfc360c646413e5068c49b6f98ea7f47dbd76a443d1f1f0557ef3eb6acf779942a63bd21d29adc3ec0cce764232bcf92aafb5b2a92159c2cc99f33a310f5',
          },
        ],
      });
      expect(estimatedFee).toEqual('160000000');
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
      const Method = promisify(client.RebuildTransaction.bind(client));
      const { serialized, signatures, estimatedFee } = await Method({
        network: {
          bech32Prefix: 'cosmos',
          provider: 'https://rpc.testnet.cosmos.network:443',
          chainId: 'cosmoshub-testnet',
        },
        serialized:
          '0a95010a92010a1c2f636f736d6f732e62616e6b2e763162657461312e4d736753656e6412720a2d636f736d6f733134686d3234653577657076357168356e79326c6335307632687537667939676b6c6364303777122d636f736d6f7331787639746b6c773764383273657a683968616135373377756667793539766d776536787865351a120a077570686f746f6e12073132333435363712690a500a460a1f2f636f736d6f732e63727970746f2e736563703235366b312e5075624b657912230a21025802f6b064ae8cd15053422905d304817c3418eb4e79f813e508127a8fc497c912040a020801180512150a0f0a077570686f746f6e1204323030301080f1041a4019b9bfc360c646413e5068c49b6f98ea7f47dbd76a443d1f1f0557ef3eb6acf779942a63bd21d29adc3ec0cce764232bcf92aafb5b2a92159c2cc99f33a310f5',
        pubKey: '025802f6b064ae8cd15053422905d304817c3418eb4e79f813e508127a8fc497c9',
        from: 'cosmos14hm24e5wepv5qh5ny2lc50v2hu7fy9gklcd07w',
        params: {
          fee: {
            amount: {
              amount: '2000',
              denom: 'uphoton',
            },
            gas: '80000',
          },
          sequence: 7,
          accountNumber: 373,
        },
      });
      expect(estimatedFee).toEqual('160000000');
      expect(serialized).toEqual(
        '0a95010a92010a1c2f636f736d6f732e62616e6b2e763162657461312e4d736753656e6412720a2d636f736d6f733134686d3234653577657076357168356e79326c6335307632687537667939676b6c6364303777122d636f736d6f7331787639746b6c773764383273657a683968616135373377756667793539766d776536787865351a120a077570686f746f6e12073132333435363712690a500a460a1f2f636f736d6f732e63727970746f2e736563703235366b312e5075624b657912230a21025802f6b064ae8cd15053422905d304817c3418eb4e79f813e508127a8fc497c912040a020801180712150a0f0a077570686f746f6e1204323030301080f104',
      );
      expect(signatures).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            hash: 'd146892dbfe79ee30a24df8414054c0519adf715c7f6ef97898e1dde53125c53',
            pubKey: '025802f6b064ae8cd15053422905d304817c3418eb4e79f813e508127a8fc497c9',
          }),
        ]),
      );
    });

    // https://api.testnet.cosmos.network/cosmos/tx/v1beta1/txs/FBF9FBF1C3F39DA7A86141FAFD3DBB22C09E96CA6019BA3F57510D9993DF0C86
    describe('Multisig Transaction', () => {
      test('DeployAccount', async () => {
        const Method = promisify(client.DeployMultisigAccount.bind(client));
        const { address } = await Method({
          network: {
            bech32Prefix: 'cosmos',
            provider: 'https://rpc.testnet.cosmos.network:443',
            chainId: 'cosmoshub-testnet',
          },
          threshold: 2,
          pubKeys: [
            '0224697014aeac3cf3ecc669bea4359cb3566e618dc54354e61bce00640684c69b',
            '0279e93cbb1bae91b507118dee2cac00074261eedcaf3755fb4f6eb0f4cb20a278',
            '0370d0bf1797e237aee05579a55edaded9283be85f7dba725d71c726b8ee5d4008',
          ],
        });
        expect(address).toEqual('cosmos18y4kun6wupgly9kja8awhnqpjhxt6hljyh85gq');
      });

      test('BuildMultisigTransferTransaction', async () => {
        const api = await provider.getReqProvider('https://rpc.testnet.cosmos.network:443');

        jest.spyOn(provider, 'getReqProvider').mockResolvedValueOnce(api);
        jest.spyOn(api, 'getAccount').mockResolvedValueOnce({
          accountNumber: 375,
          sequence: 14,
        } as any);

        const Method = promisify(client.BuildMultisigTransferTransaction.bind(client));
        const { serialized, signatures } = await Method({
          network: {
            bech32Prefix: 'cosmos',
            provider: 'https://rpc.testnet.cosmos.network:443',
            chainId: 'cosmoshub-testnet',
          },
          to: 'cosmos1mca888pm39ld9zjnaagrjcjmtm27w0tzzaydct',
          amount: {
            denom: 'uphoton',
            amount: '2000',
          },
          from: 'cosmos18y4kun6wupgly9kja8awhnqpjhxt6hljyh85gq',
          threshold: 2,
          pubKeys: [
            '0224697014aeac3cf3ecc669bea4359cb3566e618dc54354e61bce00640684c69b',
            '0279e93cbb1bae91b507118dee2cac00074261eedcaf3755fb4f6eb0f4cb20a278',
            '0370d0bf1797e237aee05579a55edaded9283be85f7dba725d71c726b8ee5d4008',
          ],
          params: {
            fee: {
              amount: {
                amount: '2000',
                denom: 'uphoton',
              },
              gas: '200000',
            },
            memo: 'happy',
          },
        });
        expect(serialized).toEqual(
          '0a99010a8f010a1c2f636f736d6f732e62616e6b2e763162657461312e4d736753656e64126f0a2d636f736d6f73313879346b756e36777570676c79396b6a61386177686e71706a68787436686c6a796838356771122d636f736d6f73316d6361383838706d33396c64397a6a6e616167726a636a6d746d32377730747a7a61796463741a0f0a077570686f746f6e12043230303012056861707079128d020a500a460a1f2f636f736d6f732e63727970746f2e736563703235366b312e5075624b657912230a210224697014aeac3cf3ecc669bea4359cb3566e618dc54354e61bce00640684c69b12040a02087f180e0a500a460a1f2f636f736d6f732e63727970746f2e736563703235366b312e5075624b657912230a210279e93cbb1bae91b507118dee2cac00074261eedcaf3755fb4f6eb0f4cb20a27812040a02087f180e0a500a460a1f2f636f736d6f732e63727970746f2e736563703235366b312e5075624b657912230a210370d0bf1797e237aee05579a55edaded9283be85f7dba725d71c726b8ee5d400812040a02087f180e12150a0f0a077570686f746f6e12043230303010c09a0c',
        );
        expect(signatures).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              pubKey: '0224697014aeac3cf3ecc669bea4359cb3566e618dc54354e61bce00640684c69b',
              hash: '6a46c04c76d859b1603d90978652ac74c25a84cfa093a6fe09a24f5a02dfcf49',
            }),
            expect.objectContaining({
              pubKey: '0279e93cbb1bae91b507118dee2cac00074261eedcaf3755fb4f6eb0f4cb20a278',
              hash: '6a46c04c76d859b1603d90978652ac74c25a84cfa093a6fe09a24f5a02dfcf49',
            }),
            expect.objectContaining({
              pubKey: '0370d0bf1797e237aee05579a55edaded9283be85f7dba725d71c726b8ee5d4008',
              hash: '6a46c04c76d859b1603d90978652ac74c25a84cfa093a6fe09a24f5a02dfcf49',
            }),
          ]),
        );
      });

      test('SignMultisigTransaction', async () => {
        const Method = promisify(client.SignMultisigTransaction.bind(client));
        const { serialized, hash } = await Method({
          network: {
            bech32Prefix: 'cosmos',
            provider: 'https://rpc.testnet.cosmos.network:443',
            chainId: 'cosmoshub-testnet',
          },
          threshold: 2,
          serialized:
            '0a99010a8f010a1c2f636f736d6f732e62616e6b2e763162657461312e4d736753656e64126f0a2d636f736d6f73313879346b756e36777570676c79396b6a61386177686e71706a68787436686c6a796838356771122d636f736d6f73316d6361383838706d33396c64397a6a6e616167726a636a6d746d32377730747a7a61796463741a0f0a077570686f746f6e12043230303012056861707079128d020a500a460a1f2f636f736d6f732e63727970746f2e736563703235366b312e5075624b657912230a210224697014aeac3cf3ecc669bea4359cb3566e618dc54354e61bce00640684c69b12040a02087f180e0a500a460a1f2f636f736d6f732e63727970746f2e736563703235366b312e5075624b657912230a210279e93cbb1bae91b507118dee2cac00074261eedcaf3755fb4f6eb0f4cb20a27812040a02087f180e0a500a460a1f2f636f736d6f732e63727970746f2e736563703235366b312e5075624b657912230a210370d0bf1797e237aee05579a55edaded9283be85f7dba725d71c726b8ee5d400812040a02087f180e12150a0f0a077570686f746f6e12043230303010c09a0c',
          signatures: [
            {
              pubKey: '0224697014aeac3cf3ecc669bea4359cb3566e618dc54354e61bce00640684c69b',
              hash: '6a46c04c76d859b1603d90978652ac74c25a84cfa093a6fe09a24f5a02dfcf49',
              signature:
                '3638620c8f26c0e9127200033a08dc012f40d3ecdf5b5d5a5078444d5104b4903ec566ba0fb7191a2f4305d6ce51a9d54f911b2ec228fd8494d50ef1491573c8',
            },
            {
              pubKey: '0279e93cbb1bae91b507118dee2cac00074261eedcaf3755fb4f6eb0f4cb20a278',
              hash: '6a46c04c76d859b1603d90978652ac74c25a84cfa093a6fe09a24f5a02dfcf49',
              signature:
                '62a0f761db84152c730145c9823edcee1cc045e9a6964984398308a8ca08a070392034d8a385530023b26213222d8525a0d729b91551595b4305aa521ee4528d',
            },
          ],
        });
        expect(hash).toEqual('FBF9FBF1C3F39DA7A86141FAFD3DBB22C09E96CA6019BA3F57510D9993DF0C86');
        expect(serialized).toEqual(
          '0a99010a8f010a1c2f636f736d6f732e62616e6b2e763162657461312e4d736753656e64126f0a2d636f736d6f73313879346b756e36777570676c79396b6a61386177686e71706a68787436686c6a796838356771122d636f736d6f73316d6361383838706d33396c64397a6a6e616167726a636a6d746d32377730747a7a61796463741a0f0a077570686f746f6e1204323030301205686170707912be020aa4020a88020a292f636f736d6f732e63727970746f2e6d756c74697369672e4c6567616379416d696e6f5075624b657912da01080212460a1f2f636f736d6f732e63727970746f2e736563703235366b312e5075624b657912230a210224697014aeac3cf3ecc669bea4359cb3566e618dc54354e61bce00640684c69b12460a1f2f636f736d6f732e63727970746f2e736563703235366b312e5075624b657912230a210279e93cbb1bae91b507118dee2cac00074261eedcaf3755fb4f6eb0f4cb20a27812460a1f2f636f736d6f732e63727970746f2e736563703235366b312e5075624b657912230a210370d0bf1797e237aee05579a55edaded9283be85f7dba725d71c726b8ee5d4008121512130a0508031201c012040a02087f12040a02087f180e12150a0f0a077570686f746f6e12043230303010c09a0c1a84010a403638620c8f26c0e9127200033a08dc012f40d3ecdf5b5d5a5078444d5104b4903ec566ba0fb7191a2f4305d6ce51a9d54f911b2ec228fd8494d50ef1491573c80a4062a0f761db84152c730145c9823edcee1cc045e9a6964984398308a8ca08a070392034d8a385530023b26213222d8525a0d729b91551595b4305aa521ee4528d',
        );
      });
    });

    describe('staking', () => {
      test('BuildDelegateTransaction', async () => {
        const api = await provider.getReqProvider('https://rpc.testnet.cosmos.network:443');

        jest.spyOn(provider, 'getReqProvider').mockResolvedValueOnce(api);
        jest.spyOn(api, 'getAccount').mockResolvedValueOnce({
          accountNumber: 496,
          sequence: 4,
        } as any);

        const Method = promisify(client.BuildDelegateTransaction.bind(client));
        const { serialized, signatures, estimatedFee } = await Method({
          network: {
            bech32Prefix: 'cosmos',
            provider: 'https://rpc.testnet.cosmos.network:443',
            chainId: 'cosmoshub-testnet',
          },
          amount: {
            denom: 'uphoton',
            amount: '1234567',
          },
          validator: 'cosmosvaloper17qukqafj25wn8gdjwzlmlcm9xl00rxxe2lxujd',
          delegator: 'cosmos1zsxdj8ksxz3endy4lnvs97humv8v76c92d9q0c',
          pubKey: '0368a767c58c25a491164fe551ade9fa21169663a6a0f5c391d67727a0aa39f42b',
          params: {
            fee: {
              amount: {
                amount: '2000',
                denom: 'uphoton',
              },
              gas: '180000',
            },
            memo: 'Use your power wisely',
          },
        });
        expect(estimatedFee).toEqual('360000000');
        expect(serialized).toEqual(
          '0aba010aa0010a232f636f736d6f732e7374616b696e672e763162657461312e4d736744656c656761746512790a2d636f736d6f73317a7378646a386b73787a33656e6479346c6e7673393768756d763876373663393264397130631234636f736d6f7376616c6f706572313771756b7161666a3235776e3867646a777a6c6d6c636d39786c303072787865326c78756a641a120a077570686f746f6e120731323334353637121555736520796f757220706f77657220776973656c7912690a500a460a1f2f636f736d6f732e63727970746f2e736563703235366b312e5075624b657912230a210368a767c58c25a491164fe551ade9fa21169663a6a0f5c391d67727a0aa39f42b12040a020801180412150a0f0a077570686f746f6e12043230303010a0fe0a',
        );
        expect(signatures).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              pubKey: '0368a767c58c25a491164fe551ade9fa21169663a6a0f5c391d67727a0aa39f42b',
              hash: 'feb634ad9fcdde285a79a6254a46c2bea1f2bea79243f30ca78906bbf6196e1e',
            }),
          ]),
        );
      });

      test('BuildUndelegateTransaction', async () => {
        const api = await provider.getReqProvider('https://rpc.testnet.cosmos.network:443');

        jest.spyOn(provider, 'getReqProvider').mockResolvedValueOnce(api);
        jest.spyOn(api, 'getAccount').mockResolvedValueOnce({
          accountNumber: 496,
          sequence: 4,
        } as any);

        const Method = promisify(client.BuildUndelegateTransaction.bind(client));
        const { serialized, signatures, estimatedFee } = await Method({
          network: {
            bech32Prefix: 'cosmos',
            provider: 'https://rpc.testnet.cosmos.network:443',
            chainId: 'cosmoshub-testnet',
          },
          amount: {
            denom: 'uphoton',
            amount: '1234567',
          },
          validator: 'cosmosvaloper17qukqafj25wn8gdjwzlmlcm9xl00rxxe2lxujd',
          delegator: 'cosmos1zsxdj8ksxz3endy4lnvs97humv8v76c92d9q0c',
          pubKey: '0368a767c58c25a491164fe551ade9fa21169663a6a0f5c391d67727a0aa39f42b',
          params: {
            fee: {
              amount: {
                amount: '2000',
                denom: 'uphoton',
              },
              gas: '180000',
            },
            memo: 'Use your power wisely',
          },
        });
        expect(estimatedFee).toEqual('360000000');
        expect(serialized).toEqual(
          '0abc010aa2010a252f636f736d6f732e7374616b696e672e763162657461312e4d7367556e64656c656761746512790a2d636f736d6f73317a7378646a386b73787a33656e6479346c6e7673393768756d763876373663393264397130631234636f736d6f7376616c6f706572313771756b7161666a3235776e3867646a777a6c6d6c636d39786c303072787865326c78756a641a120a077570686f746f6e120731323334353637121555736520796f757220706f77657220776973656c7912690a500a460a1f2f636f736d6f732e63727970746f2e736563703235366b312e5075624b657912230a210368a767c58c25a491164fe551ade9fa21169663a6a0f5c391d67727a0aa39f42b12040a020801180412150a0f0a077570686f746f6e12043230303010a0fe0a',
        );
        expect(signatures).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              pubKey: '0368a767c58c25a491164fe551ade9fa21169663a6a0f5c391d67727a0aa39f42b',
              hash: '60a2c4c4e98deeaf339922947a1cd2b1b33916e451d201553a297d6d79ed1d0b',
            }),
          ]),
        );
      });

      test('BuildRedelegateTransaction', async () => {
        const api = await provider.getReqProvider('https://rpc.testnet.cosmos.network:443');

        jest.spyOn(provider, 'getReqProvider').mockResolvedValueOnce(api);
        jest.spyOn(api, 'getAccount').mockResolvedValueOnce({
          accountNumber: 496,
          sequence: 4,
        } as any);

        const Method = promisify(client.BuildRedelegateTransaction.bind(client));
        const { serialized, signatures, estimatedFee } = await Method({
          network: {
            bech32Prefix: 'cosmos',
            provider: 'https://rpc.testnet.cosmos.network:443',
            chainId: 'cosmoshub-testnet',
          },
          amount: {
            denom: 'uphoton',
            amount: '1234567',
          },
          validatorSrcAddress: 'cosmosvaloper17qukqafj25wn8gdjwzlmlcm9xl00rxxe2lxujd',
          validatorDstAddress: 'cosmosvaloper17qukqafj25wn8gdjwzlmlcm9xl00rxxe2lxujd',
          delegator: 'cosmos1zsxdj8ksxz3endy4lnvs97humv8v76c92d9q0c',
          pubKey: '0368a767c58c25a491164fe551ade9fa21169663a6a0f5c391d67727a0aa39f42b',
          params: {
            fee: {
              amount: {
                amount: '2000',
                denom: 'uphoton',
              },
              gas: '180000',
            },
            memo: 'Use your power wisely',
          },
        });
        expect(estimatedFee).toEqual('360000000');
        expect(serialized).toEqual(
          '0af8010ade010a2a2f636f736d6f732e7374616b696e672e763162657461312e4d7367426567696e526564656c656761746512af010a2d636f736d6f73317a7378646a386b73787a33656e6479346c6e7673393768756d763876373663393264397130631234636f736d6f7376616c6f706572313771756b7161666a3235776e3867646a777a6c6d6c636d39786c303072787865326c78756a641a34636f736d6f7376616c6f706572313771756b7161666a3235776e3867646a777a6c6d6c636d39786c303072787865326c78756a6422120a077570686f746f6e120731323334353637121555736520796f757220706f77657220776973656c7912690a500a460a1f2f636f736d6f732e63727970746f2e736563703235366b312e5075624b657912230a210368a767c58c25a491164fe551ade9fa21169663a6a0f5c391d67727a0aa39f42b12040a020801180412150a0f0a077570686f746f6e12043230303010a0fe0a',
        );
        expect(signatures).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              pubKey: '0368a767c58c25a491164fe551ade9fa21169663a6a0f5c391d67727a0aa39f42b',
              hash: 'f82054f9fb65d88279448cdde8c3b36d1dc8341d9e5fec454339f339e6ba9f03',
            }),
          ]),
        );
      });

      test('BuildWithdrawDelegationRewardTransaction', async () => {
        const api = await provider.getReqProvider('https://rpc.testnet.cosmos.network:443');

        jest.spyOn(provider, 'getReqProvider').mockResolvedValueOnce(api);
        jest.spyOn(api, 'getAccount').mockResolvedValueOnce({
          accountNumber: 496,
          sequence: 4,
        } as any);

        const Method = promisify(client.BuildWithdrawDelegationRewardTransaction.bind(client));
        const { serialized, signatures, estimatedFee } = await Method({
          network: {
            bech32Prefix: 'cosmos',
            provider: 'https://rpc.testnet.cosmos.network:443',
            chainId: 'cosmoshub-testnet',
          },
          amount: {
            denom: 'uphoton',
            amount: '1234567',
          },
          validators: ['cosmosvaloper17qukqafj25wn8gdjwzlmlcm9xl00rxxe2lxujd'],
          delegator: 'cosmos1zsxdj8ksxz3endy4lnvs97humv8v76c92d9q0c',
          pubKey: '0368a767c58c25a491164fe551ade9fa21169663a6a0f5c391d67727a0aa39f42b',
          params: {
            fee: {
              amount: {
                amount: '2000',
                denom: 'uphoton',
              },
              gas: '180000',
            },
            memo: 'Use your power wisely',
          },
        });
        expect(estimatedFee).toEqual('360000000');
        expect(serialized).toEqual(
          '0aba010aa0010a372f636f736d6f732e646973747269627574696f6e2e763162657461312e4d7367576974686472617744656c656761746f7252657761726412650a2d636f736d6f73317a7378646a386b73787a33656e6479346c6e7673393768756d763876373663393264397130631234636f736d6f7376616c6f706572313771756b7161666a3235776e3867646a777a6c6d6c636d39786c303072787865326c78756a64121555736520796f757220706f77657220776973656c7912690a500a460a1f2f636f736d6f732e63727970746f2e736563703235366b312e5075624b657912230a210368a767c58c25a491164fe551ade9fa21169663a6a0f5c391d67727a0aa39f42b12040a020801180412150a0f0a077570686f746f6e12043230303010a0fe0a',
        );
        expect(signatures).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              pubKey: '0368a767c58c25a491164fe551ade9fa21169663a6a0f5c391d67727a0aa39f42b',
              hash: 'f9b5ca99d6a5cb63ca54eda1c105e0f971598aafd2fee3ab20f7af6db666e188',
            }),
          ]),
        );
      });
    });

    describe('multisig staking', () => {
      test('BuildMultisigDelegateTransaction', async () => {
        const api = await provider.getReqProvider('https://rpc.testnet.cosmos.network:443');

        jest.spyOn(provider, 'getReqProvider').mockResolvedValueOnce(api);
        jest.spyOn(api, 'getAccount').mockResolvedValueOnce({
          accountNumber: 376,
          sequence: 15,
        } as any);

        const Method = promisify(client.BuildMultisigDelegateTransaction.bind(client));
        const { serialized, signatures, estimatedFee } = await Method({
          network: {
            bech32Prefix: 'cosmos',
            provider: 'https://rpc.testnet.cosmos.network:443',
            chainId: 'cosmoshub-testnet',
          },
          amount: {
            denom: 'uphoton',
            amount: '1234567',
          },
          validator: 'cosmosvaloper17qukqafj25wn8gdjwzlmlcm9xl00rxxe2lxujd',
          delegator: 'cosmos14txtjx9yx8zjxhu6s2jpa8xsx6auz3rhq7zhus',
          threshold: 2,
          pubKeys: [
            '03a27c169e657513fd93defd3843534ed349aea9c4f412ea99bd9a6b32538f932c',
            '03a2d4bbc569f7311464abf80ecac3aaab203d0872d1eeb719656f54b0e51b82af',
            '02e8eee1afa2e9e1a52078ad8fb75533191ec0a3f8d1a6cee59b72d9868acc7e41',
            '0224697014aeac3cf3ecc669bea4359cb3566e618dc54354e61bce00640684c69b',
            '02ff9cbb8851799877b6dee0374b606e9b396b879796a8677d1d6b5dcdd9b76311',
          ],
          params: {
            fee: {
              amount: {
                denom: 'uphoton',
                amount: '2000',
              },
              gas: '200000',
            },
            memo: 'Use your power wisely',
          },
        });
        expect(estimatedFee).toEqual('400000000');
        expect(serialized).toEqual(
          '0aba010aa0010a232f636f736d6f732e7374616b696e672e763162657461312e4d736744656c656761746512790a2d636f736d6f7331347478746a78397978387a6a7868753673326a7061387873783661757a33726871377a6875731234636f736d6f7376616c6f706572313771756b7161666a3235776e3867646a777a6c6d6c636d39786c303072787865326c78756a641a120a077570686f746f6e120731323334353637121555736520796f757220706f77657220776973656c7912b1030a500a460a1f2f636f736d6f732e63727970746f2e736563703235366b312e5075624b657912230a2103a27c169e657513fd93defd3843534ed349aea9c4f412ea99bd9a6b32538f932c12040a02087f180f0a500a460a1f2f636f736d6f732e63727970746f2e736563703235366b312e5075624b657912230a2103a2d4bbc569f7311464abf80ecac3aaab203d0872d1eeb719656f54b0e51b82af12040a02087f180f0a500a460a1f2f636f736d6f732e63727970746f2e736563703235366b312e5075624b657912230a2102e8eee1afa2e9e1a52078ad8fb75533191ec0a3f8d1a6cee59b72d9868acc7e4112040a02087f180f0a500a460a1f2f636f736d6f732e63727970746f2e736563703235366b312e5075624b657912230a210224697014aeac3cf3ecc669bea4359cb3566e618dc54354e61bce00640684c69b12040a02087f180f0a500a460a1f2f636f736d6f732e63727970746f2e736563703235366b312e5075624b657912230a2102ff9cbb8851799877b6dee0374b606e9b396b879796a8677d1d6b5dcdd9b7631112040a02087f180f12150a0f0a077570686f746f6e12043230303010c09a0c',
        );
        expect(signatures).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              pubKey: '03a27c169e657513fd93defd3843534ed349aea9c4f412ea99bd9a6b32538f932c',
              hash: '33db9c4df833d74f43767bfd417b5879d255f236f969f07f3800be595354f5f0',
            }),
            expect.objectContaining({
              pubKey: '03a2d4bbc569f7311464abf80ecac3aaab203d0872d1eeb719656f54b0e51b82af',
              hash: '33db9c4df833d74f43767bfd417b5879d255f236f969f07f3800be595354f5f0',
            }),
            expect.objectContaining({
              pubKey: '02e8eee1afa2e9e1a52078ad8fb75533191ec0a3f8d1a6cee59b72d9868acc7e41',
              hash: '33db9c4df833d74f43767bfd417b5879d255f236f969f07f3800be595354f5f0',
            }),
            expect.objectContaining({
              pubKey: '0224697014aeac3cf3ecc669bea4359cb3566e618dc54354e61bce00640684c69b',
              hash: '33db9c4df833d74f43767bfd417b5879d255f236f969f07f3800be595354f5f0',
            }),
            expect.objectContaining({
              pubKey: '02ff9cbb8851799877b6dee0374b606e9b396b879796a8677d1d6b5dcdd9b76311',
              hash: '33db9c4df833d74f43767bfd417b5879d255f236f969f07f3800be595354f5f0',
            }),
          ]),
        );
      });

      test('BuildMultisigUndelegateTransaction', async () => {
        const api = await provider.getReqProvider('https://rpc.testnet.cosmos.network:443');

        jest.spyOn(provider, 'getReqProvider').mockResolvedValueOnce(api);
        jest.spyOn(api, 'getAccount').mockResolvedValueOnce({
          accountNumber: 376,
          sequence: 15,
        } as any);

        const Method = promisify(client.BuildMultisigUndelegateTransaction.bind(client));
        const { serialized, signatures, estimatedFee } = await Method({
          network: {
            bech32Prefix: 'cosmos',
            provider: 'https://rpc.testnet.cosmos.network:443',
            chainId: 'cosmoshub-testnet',
          },
          amount: {
            denom: 'uphoton',
            amount: '1234567',
          },
          validator: 'cosmosvaloper17qukqafj25wn8gdjwzlmlcm9xl00rxxe2lxujd',
          delegator: 'cosmos14txtjx9yx8zjxhu6s2jpa8xsx6auz3rhq7zhus',
          threshold: 2,
          pubKeys: [
            '03a27c169e657513fd93defd3843534ed349aea9c4f412ea99bd9a6b32538f932c',
            '03a2d4bbc569f7311464abf80ecac3aaab203d0872d1eeb719656f54b0e51b82af',
            '02e8eee1afa2e9e1a52078ad8fb75533191ec0a3f8d1a6cee59b72d9868acc7e41',
            '0224697014aeac3cf3ecc669bea4359cb3566e618dc54354e61bce00640684c69b',
            '02ff9cbb8851799877b6dee0374b606e9b396b879796a8677d1d6b5dcdd9b76311',
          ],
          params: {
            fee: {
              amount: {
                denom: 'uphoton',
                amount: '2000',
              },
              gas: '200000',
            },
            memo: 'Use your power wisely',
          },
        });
        expect(estimatedFee).toEqual('400000000');
        expect(serialized).toEqual(
          '0abc010aa2010a252f636f736d6f732e7374616b696e672e763162657461312e4d7367556e64656c656761746512790a2d636f736d6f7331347478746a78397978387a6a7868753673326a7061387873783661757a33726871377a6875731234636f736d6f7376616c6f706572313771756b7161666a3235776e3867646a777a6c6d6c636d39786c303072787865326c78756a641a120a077570686f746f6e120731323334353637121555736520796f757220706f77657220776973656c7912b1030a500a460a1f2f636f736d6f732e63727970746f2e736563703235366b312e5075624b657912230a2103a27c169e657513fd93defd3843534ed349aea9c4f412ea99bd9a6b32538f932c12040a02087f180f0a500a460a1f2f636f736d6f732e63727970746f2e736563703235366b312e5075624b657912230a2103a2d4bbc569f7311464abf80ecac3aaab203d0872d1eeb719656f54b0e51b82af12040a02087f180f0a500a460a1f2f636f736d6f732e63727970746f2e736563703235366b312e5075624b657912230a2102e8eee1afa2e9e1a52078ad8fb75533191ec0a3f8d1a6cee59b72d9868acc7e4112040a02087f180f0a500a460a1f2f636f736d6f732e63727970746f2e736563703235366b312e5075624b657912230a210224697014aeac3cf3ecc669bea4359cb3566e618dc54354e61bce00640684c69b12040a02087f180f0a500a460a1f2f636f736d6f732e63727970746f2e736563703235366b312e5075624b657912230a2102ff9cbb8851799877b6dee0374b606e9b396b879796a8677d1d6b5dcdd9b7631112040a02087f180f12150a0f0a077570686f746f6e12043230303010c09a0c',
        );
        expect(signatures).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              pubKey: '03a27c169e657513fd93defd3843534ed349aea9c4f412ea99bd9a6b32538f932c',
              hash: '994fa29337c8db63e2c1ea95557f88cff9757c9808ca93724e469b22b8490058',
            }),
            expect.objectContaining({
              pubKey: '03a2d4bbc569f7311464abf80ecac3aaab203d0872d1eeb719656f54b0e51b82af',
              hash: '994fa29337c8db63e2c1ea95557f88cff9757c9808ca93724e469b22b8490058',
            }),
            expect.objectContaining({
              pubKey: '02e8eee1afa2e9e1a52078ad8fb75533191ec0a3f8d1a6cee59b72d9868acc7e41',
              hash: '994fa29337c8db63e2c1ea95557f88cff9757c9808ca93724e469b22b8490058',
            }),
            expect.objectContaining({
              pubKey: '0224697014aeac3cf3ecc669bea4359cb3566e618dc54354e61bce00640684c69b',
              hash: '994fa29337c8db63e2c1ea95557f88cff9757c9808ca93724e469b22b8490058',
            }),
            expect.objectContaining({
              pubKey: '02ff9cbb8851799877b6dee0374b606e9b396b879796a8677d1d6b5dcdd9b76311',
              hash: '994fa29337c8db63e2c1ea95557f88cff9757c9808ca93724e469b22b8490058',
            }),
          ]),
        );
      });

      test('BuildMultisigRedelegateTransaction', async () => {
        const api = await provider.getReqProvider('https://rpc.testnet.cosmos.network:443');

        jest.spyOn(provider, 'getReqProvider').mockResolvedValueOnce(api);
        jest.spyOn(api, 'getAccount').mockResolvedValueOnce({
          accountNumber: 376,
          sequence: 15,
        } as any);

        const Method = promisify(client.BuildMultisigRedelegateTransaction.bind(client));
        const { serialized, signatures, estimatedFee } = await Method({
          network: {
            bech32Prefix: 'cosmos',
            provider: 'https://rpc.testnet.cosmos.network:443',
            chainId: 'cosmoshub-testnet',
          },
          amount: {
            denom: 'uphoton',
            amount: '1234567',
          },
          validatorSrcAddress: 'cosmosvaloper17qukqafj25wn8gdjwzlmlcm9xl00rxxe2lxujd',
          validatorDstAddress: 'cosmosvaloper17qukqafj25wn8gdjwzlmlcm9xl00rxxe2lxujd',
          delegator: 'cosmos14txtjx9yx8zjxhu6s2jpa8xsx6auz3rhq7zhus',
          threshold: 2,
          pubKeys: [
            '03a27c169e657513fd93defd3843534ed349aea9c4f412ea99bd9a6b32538f932c',
            '03a2d4bbc569f7311464abf80ecac3aaab203d0872d1eeb719656f54b0e51b82af',
            '02e8eee1afa2e9e1a52078ad8fb75533191ec0a3f8d1a6cee59b72d9868acc7e41',
            '0224697014aeac3cf3ecc669bea4359cb3566e618dc54354e61bce00640684c69b',
            '02ff9cbb8851799877b6dee0374b606e9b396b879796a8677d1d6b5dcdd9b76311',
          ],
          params: {
            fee: {
              amount: {
                denom: 'uphoton',
                amount: '2000',
              },
              gas: '200000',
            },
            memo: 'Use your power wisely',
          },
        });
        expect(estimatedFee).toEqual('400000000');
        expect(serialized).toEqual(
          '0af8010ade010a2a2f636f736d6f732e7374616b696e672e763162657461312e4d7367426567696e526564656c656761746512af010a2d636f736d6f7331347478746a78397978387a6a7868753673326a7061387873783661757a33726871377a6875731234636f736d6f7376616c6f706572313771756b7161666a3235776e3867646a777a6c6d6c636d39786c303072787865326c78756a641a34636f736d6f7376616c6f706572313771756b7161666a3235776e3867646a777a6c6d6c636d39786c303072787865326c78756a6422120a077570686f746f6e120731323334353637121555736520796f757220706f77657220776973656c7912b1030a500a460a1f2f636f736d6f732e63727970746f2e736563703235366b312e5075624b657912230a2103a27c169e657513fd93defd3843534ed349aea9c4f412ea99bd9a6b32538f932c12040a02087f180f0a500a460a1f2f636f736d6f732e63727970746f2e736563703235366b312e5075624b657912230a2103a2d4bbc569f7311464abf80ecac3aaab203d0872d1eeb719656f54b0e51b82af12040a02087f180f0a500a460a1f2f636f736d6f732e63727970746f2e736563703235366b312e5075624b657912230a2102e8eee1afa2e9e1a52078ad8fb75533191ec0a3f8d1a6cee59b72d9868acc7e4112040a02087f180f0a500a460a1f2f636f736d6f732e63727970746f2e736563703235366b312e5075624b657912230a210224697014aeac3cf3ecc669bea4359cb3566e618dc54354e61bce00640684c69b12040a02087f180f0a500a460a1f2f636f736d6f732e63727970746f2e736563703235366b312e5075624b657912230a2102ff9cbb8851799877b6dee0374b606e9b396b879796a8677d1d6b5dcdd9b7631112040a02087f180f12150a0f0a077570686f746f6e12043230303010c09a0c',
        );
        expect(signatures).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              pubKey: '03a27c169e657513fd93defd3843534ed349aea9c4f412ea99bd9a6b32538f932c',
              hash: '295093f2d1dca009acd9996df2d4d1357538ad3abbfac1a3c30ffbbb4101b162',
            }),
            expect.objectContaining({
              pubKey: '03a2d4bbc569f7311464abf80ecac3aaab203d0872d1eeb719656f54b0e51b82af',
              hash: '295093f2d1dca009acd9996df2d4d1357538ad3abbfac1a3c30ffbbb4101b162',
            }),
            expect.objectContaining({
              pubKey: '02e8eee1afa2e9e1a52078ad8fb75533191ec0a3f8d1a6cee59b72d9868acc7e41',
              hash: '295093f2d1dca009acd9996df2d4d1357538ad3abbfac1a3c30ffbbb4101b162',
            }),
            expect.objectContaining({
              pubKey: '0224697014aeac3cf3ecc669bea4359cb3566e618dc54354e61bce00640684c69b',
              hash: '295093f2d1dca009acd9996df2d4d1357538ad3abbfac1a3c30ffbbb4101b162',
            }),
            expect.objectContaining({
              pubKey: '02ff9cbb8851799877b6dee0374b606e9b396b879796a8677d1d6b5dcdd9b76311',
              hash: '295093f2d1dca009acd9996df2d4d1357538ad3abbfac1a3c30ffbbb4101b162',
            }),
          ]),
        );
      });

      test('BuildMultisigWithdrawDelegationRewardTransaction', async () => {
        const api = await provider.getReqProvider('https://rpc.testnet.cosmos.network:443');

        jest.spyOn(provider, 'getReqProvider').mockResolvedValueOnce(api);
        jest.spyOn(api, 'getAccount').mockResolvedValueOnce({
          accountNumber: 376,
          sequence: 15,
        } as any);

        const Method = promisify(client.BuildMultisigWithdrawDelegationRewardTransaction.bind(client));
        const { serialized, signatures, estimatedFee } = await Method({
          network: {
            bech32Prefix: 'cosmos',
            provider: 'https://rpc.testnet.cosmos.network:443',
            chainId: 'cosmoshub-testnet',
          },
          amount: {
            denom: 'uphoton',
            amount: '1234567',
          },
          validators: ['cosmosvaloper17qukqafj25wn8gdjwzlmlcm9xl00rxxe2lxujd'],
          delegator: 'cosmos14txtjx9yx8zjxhu6s2jpa8xsx6auz3rhq7zhus',
          threshold: 2,
          pubKeys: [
            '03a27c169e657513fd93defd3843534ed349aea9c4f412ea99bd9a6b32538f932c',
            '03a2d4bbc569f7311464abf80ecac3aaab203d0872d1eeb719656f54b0e51b82af',
            '02e8eee1afa2e9e1a52078ad8fb75533191ec0a3f8d1a6cee59b72d9868acc7e41',
            '0224697014aeac3cf3ecc669bea4359cb3566e618dc54354e61bce00640684c69b',
            '02ff9cbb8851799877b6dee0374b606e9b396b879796a8677d1d6b5dcdd9b76311',
          ],
          params: {
            fee: {
              amount: {
                denom: 'uphoton',
                amount: '2000',
              },
              gas: '200000',
            },
            memo: 'Use your power wisely',
          },
        });
        expect(estimatedFee).toEqual('400000000');
        expect(serialized).toEqual(
          '0aba010aa0010a372f636f736d6f732e646973747269627574696f6e2e763162657461312e4d7367576974686472617744656c656761746f7252657761726412650a2d636f736d6f7331347478746a78397978387a6a7868753673326a7061387873783661757a33726871377a6875731234636f736d6f7376616c6f706572313771756b7161666a3235776e3867646a777a6c6d6c636d39786c303072787865326c78756a64121555736520796f757220706f77657220776973656c7912b1030a500a460a1f2f636f736d6f732e63727970746f2e736563703235366b312e5075624b657912230a2103a27c169e657513fd93defd3843534ed349aea9c4f412ea99bd9a6b32538f932c12040a02087f180f0a500a460a1f2f636f736d6f732e63727970746f2e736563703235366b312e5075624b657912230a2103a2d4bbc569f7311464abf80ecac3aaab203d0872d1eeb719656f54b0e51b82af12040a02087f180f0a500a460a1f2f636f736d6f732e63727970746f2e736563703235366b312e5075624b657912230a2102e8eee1afa2e9e1a52078ad8fb75533191ec0a3f8d1a6cee59b72d9868acc7e4112040a02087f180f0a500a460a1f2f636f736d6f732e63727970746f2e736563703235366b312e5075624b657912230a210224697014aeac3cf3ecc669bea4359cb3566e618dc54354e61bce00640684c69b12040a02087f180f0a500a460a1f2f636f736d6f732e63727970746f2e736563703235366b312e5075624b657912230a2102ff9cbb8851799877b6dee0374b606e9b396b879796a8677d1d6b5dcdd9b7631112040a02087f180f12150a0f0a077570686f746f6e12043230303010c09a0c',
        );
        expect(signatures).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              pubKey: '03a27c169e657513fd93defd3843534ed349aea9c4f412ea99bd9a6b32538f932c',
              hash: '047f644521db6efecb1144695468b885c22b62505b4b84e4c3da5142e99ce49f',
            }),
            expect.objectContaining({
              pubKey: '03a2d4bbc569f7311464abf80ecac3aaab203d0872d1eeb719656f54b0e51b82af',
              hash: '047f644521db6efecb1144695468b885c22b62505b4b84e4c3da5142e99ce49f',
            }),
            expect.objectContaining({
              pubKey: '02e8eee1afa2e9e1a52078ad8fb75533191ec0a3f8d1a6cee59b72d9868acc7e41',
              hash: '047f644521db6efecb1144695468b885c22b62505b4b84e4c3da5142e99ce49f',
            }),
            expect.objectContaining({
              pubKey: '0224697014aeac3cf3ecc669bea4359cb3566e618dc54354e61bce00640684c69b',
              hash: '047f644521db6efecb1144695468b885c22b62505b4b84e4c3da5142e99ce49f',
            }),
            expect.objectContaining({
              pubKey: '02ff9cbb8851799877b6dee0374b606e9b396b879796a8677d1d6b5dcdd9b76311',
              hash: '047f644521db6efecb1144695468b885c22b62505b4b84e4c3da5142e99ce49f',
            }),
          ]),
        );
      });
    });
  });
});
