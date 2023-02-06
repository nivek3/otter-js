import 'dotenv/config';
import path from 'path';
import { promisify } from 'util';

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { grpcServer } from '@src/services/grpc';

const PROTO_PATH = path.join(__dirname, '../../../proto/ripple.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  longs: String,
  defaults: false,
  oneofs: true,
});
const Ripple = (grpc.loadPackageDefinition(packageDefinition) as any)?.ripple.Ripple;
let client;

describe('Ripple service', () => {
  describe('BuildAccount', () => {
    beforeAll(async () => {
      await grpcServer.start();
      client = new Ripple(`localhost:${process.env.GRPC_PORT}`, grpc.credentials.createInsecure());
    });

    afterAll(async () => {
      client?.close();
      await grpcServer.stop();
    });

    describe('DeployAccount', () => {
      test('generate address', (done) => {
        const key = '03DC226B7DDFB6AE7CC24B13D98A53CB9E30B7394FDA3B0F0C885BA41EBDC0F794';
        const address = 'rsuUYDM8d15J44pZbdKumiDcnXHjPEuhXE';
        client.DeployAccount(
          {
            key,
          },
          (err: grpc.ServiceError, response) => {
            expect(err).toBeNull();
            expect(response).toHaveProperty('address', address);
            done();
          },
        );
      });
    });

    describe('BuildPaymentTransaction', () => {
      test('account payment', async () => {
        const req = {
          from: {
            // pubKey: '035ABF78147D2CAB552A4CCE6067457023100E9B9A8B4B097847428B0F03216669',
            address: 'rfXgErjK96k59evDnC22zX7vRo2hYaSiqc',
          },
          quantity: '1000000',
          destination: 'rUCzEr6jrEyMpjhs4wSdQdz4g8Y382NxfM',
          params: {
            lastLedgerSequence: 19194490,
            fee: '12',
            sequence: 19165274,
          },
          network: {
            provider: 'wss://s.altnet.rippletest.net/',
          },
        };
        const BuildPaymentTransaction = promisify(client.BuildPaymentTransaction.bind(client));
        const { serialized } = await BuildPaymentTransaction(req);
        expect(serialized).toEqual(
          '1200002280000000240124705A201B0124E27A6140000000000F424068400000000000000C8114479DFDA47DC5E11BFF00A06888164CAD3793B8C283148008F9193579C7D32FAF4AD1A9BFFDB236F148E3',
        );
      });

      test('multisig payment', async () => {
        const req = {
          from: {
            address: 'rfXgErjK96k59evDnC22zX7vRo2hYaSiqc',
          },
          quantity: '1000000',
          destination: 'rGtkPCrTgq5st3uSsyz5YnHMETYQdQofUS',
          signersCount: 2,
          params: {
            lastLedgerSequence: 19388357,
            fee: '36',
            sequence: 19165280,
          },
          network: {
            provider: 'wss://s.altnet.rippletest.net/',
          },
        };
        const BuildPaymentTransaction = promisify(client.BuildPaymentTransaction.bind(client));
        const { serialized } = await BuildPaymentTransaction(req);
        expect(serialized).toEqual(
          '12000022800000002401247060201B0127D7C56140000000000F42406840000000000000248114479DFDA47DC5E11BFF00A06888164CAD3793B8C28314AE53524B781412EA1ED3BAB93913AFA763C21148',
        );
      });
    });

    describe('BuildAccountSetTransaction', () => {
      test('account setFlag', async () => {
        const req = {
          account: {
            // pubKey: '035ABF78147D2CAB552A4CCE6067457023100E9B9A8B4B097847428B0F03216669',
            address: 'rfXgErjK96k59evDnC22zX7vRo2hYaSiqc',
          },
          params: {
            lastLedgerSequence: 19424686,
            fee: '12',
            sequence: 19165283,
          },
          setFlag: 4,
          network: {
            provider: 'wss://s.altnet.rippletest.net/',
          },
        };
        const BuildAccountSetTransaction = promisify(client.BuildAccountSetTransaction.bind(client));
        const { serialized } = await BuildAccountSetTransaction(req);
        expect(serialized).toEqual(
          '12000322800000002401247063201B012865AE20210000000468400000000000000C8114479DFDA47DC5E11BFF00A06888164CAD3793B8C2',
        );
      });

      test('account clearFlag', async () => {
        const req = {
          account: {
            // pubKey: '035ABF78147D2CAB552A4CCE6067457023100E9B9A8B4B097847428B0F03216669',
            address: 'rfXgErjK96k59evDnC22zX7vRo2hYaSiqc',
          },
          params: {
            lastLedgerSequence: 19424686,
            fee: '12',
            sequence: 19165283,
          },
          clearFlag: 4,
          network: {
            provider: 'wss://s.altnet.rippletest.net/',
          },
        };
        const BuildAccountSetTransaction = promisify(client.BuildAccountSetTransaction.bind(client));
        const { serialized } = await BuildAccountSetTransaction(req);
        expect(serialized).toEqual(
          '12000322800000002401247063201B012865AE20220000000468400000000000000C8114479DFDA47DC5E11BFF00A06888164CAD3793B8C2',
        );
      });
    });

    // https://xrpl.org/submit_multisigned.html#submit_multisigned
    describe('BuildSignerListSetTransaction', () => {
      test('signer list set', async () => {
        const req = {
          account: {
            // pubKey: '035ABF78147D2CAB552A4CCE6067457023100E9B9A8B4B097847428B0F03216669',
            address: 'rfXgErjK96k59evDnC22zX7vRo2hYaSiqc',
          },
          signerQuorum: 2,
          signerEntries: [
            {
              account: 'r3Q3D8nsyu2nJKFsagHfYdMp8H1VEHd3ps',
              signerWeight: 1,
            },
            {
              account: 'rhiWpgj8ai3QxegWAe3ZpHk6iionnbtAz1',
              signerWeight: 1,
            },
            {
              account: 'r3DtjVnBbAf63zryETCjx8NG2j3ewNcJ9g',
              signerWeight: 1,
            },
          ],
          params: {
            lastLedgerSequence: 19426724,
            fee: '12',
            sequence: 19165283,
          },
          network: {
            provider: 'wss://s.altnet.rippletest.net/',
          },
        };
        const method = promisify(client.BuildSignerListSetTransaction.bind(client));
        const { serialized } = await method(req);
        expect(serialized).toEqual(
          '12000C22800000002401247063201B01286DA420230000000268400000000000000C8114479DFDA47DC5E11BFF00A06888164CAD3793B8C2F4EB13000181145128798CDDE9DCA099454B5702CB0730688F5CB1E1EB13000181142A44FDE0E611A3BAF1E9DF640A87CB690152CD4BE1EB13000181144F390E5E860550DE2BD4E26360A06666B38BD840E1F1',
        );
      });

      test('delete a signer list,', async () => {
        const req = {
          account: {
            // pubKey: '035ABF78147D2CAB552A4CCE6067457023100E9B9A8B4B097847428B0F03216669',
            address: 'rfXgErjK96k59evDnC22zX7vRo2hYaSiqc',
          },
          signerQuorum: 0,
          params: {
            lastLedgerSequence: 19426724,
            fee: '12',
            sequence: 19165283,
          },
          network: {
            provider: 'wss://s.altnet.rippletest.net/',
          },
        };
        const method = promisify(client.BuildSignerListSetTransaction.bind(client));
        const { serialized } = await method(req);
        expect(serialized).toEqual(
          '12000C22800000002401247063201B01286DA420230000000068400000000000000C8114479DFDA47DC5E11BFF00A06888164CAD3793B8C2',
        );
      });
    });

    describe('HashForSignature', () => {
      test('account payment', async () => {
        const req = {
          accounts: [
            {
              pubKey: '035ABF78147D2CAB552A4CCE6067457023100E9B9A8B4B097847428B0F03216669',
            },
          ],
          serialized:
            '1200002280000000240124705A201B0124E27A6140000000000F424068400000000000000C8114479DFDA47DC5E11BFF00A06888164CAD3793B8C283148008F9193579C7D32FAF4AD1A9BFFDB236F148E3',
          network: {
            provider: 'wss://s.altnet.rippletest.net/',
          },
        };

        const HashForSignature = promisify(client.HashForSignature.bind(client));
        const { serialized, signatures } = await HashForSignature(req);
        expect(serialized).toEqual(
          '1200002280000000240124705A201B0124E27A6140000000000F424068400000000000000C7321035ABF78147D2CAB552A4CCE6067457023100E9B9A8B4B097847428B0F032166698114479DFDA47DC5E11BFF00A06888164CAD3793B8C283148008F9193579C7D32FAF4AD1A9BFFDB236F148E3',
        );
        expect(signatures).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              pubKey: '035ABF78147D2CAB552A4CCE6067457023100E9B9A8B4B097847428B0F03216669',
              hash: '58c998d6e65a841511d226524d0c1eff1628bbfc603b6c3f5ca02e148db3ca8e',
            }),
          ]),
        );
      });

      test('multisig payment', async () => {
        const req = {
          serialized:
            '12000022800000002401247060201B0127E9276140000000000F42406840000000000000248114479DFDA47DC5E11BFF00A06888164CAD3793B8C28314AE53524B781412EA1ED3BAB93913AFA763C21148',
          accounts: [
            {
              pubKey: '0366CCF6281AF55D8BD53D19940448FBE9F2722D7B09BDE7F43F758A3DDFF06510',
              address: 'rGtkPCrTgq5st3uSsyz5YnHMETYQdQofUS',
            },
            {
              pubKey: '02AA3C6C46F2A5B6F72CDC2048A502BE9486972D0430EA88DF89837A028FBD0577',
              address: 'rweTZdJmr67cVuWnqqUQbUqcDGugpnRehc',
            },
          ],
          signersCount: 2,
          network: {
            provider: 'wss://s.altnet.rippletest.net/',
          },
        };

        const HashForSignature = promisify(client.HashForSignature.bind(client));
        const { serialized, signatures } = await HashForSignature(req);
        expect(serialized).toEqual(
          '12000022800000002401247060201B0127E9276140000000000F424068400000000000002473008114479DFDA47DC5E11BFF00A06888164CAD3793B8C28314AE53524B781412EA1ED3BAB93913AFA763C21148F3E01073210366CCF6281AF55D8BD53D19940448FBE9F2722D7B09BDE7F43F758A3DDFF0651074008114AE53524B781412EA1ED3BAB93913AFA763C21148E1E010732102AA3C6C46F2A5B6F72CDC2048A502BE9486972D0430EA88DF89837A028FBD05777400811469CEB227527043E66B6829CE06DCE80FEC165331E1F1',
        );
        expect(signatures).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              hash: 'c136af9dfd3aa4106d6ae4beade010c6292eee8df1073e5f377bede37fec60',
              pubKey: '0366CCF6281AF55D8BD53D19940448FBE9F2722D7B09BDE7F43F758A3DDFF06510',
            }),
            expect.objectContaining({
              hash: '17c283a4302b96e218d324f9735dfec9b2df463d0bc5ffbbde63117aea628ab1',
              pubKey: '02AA3C6C46F2A5B6F72CDC2048A502BE9486972D0430EA88DF89837A028FBD0577',
            }),
          ]),
        );
      });
    });

    describe('SignTransaction', () => {
      test('account payment', async () => {
        const req = {
          serialized:
            '1200002280000000240124705A201B0124E27A6140000000000F424068400000000000000C7321035ABF78147D2CAB552A4CCE6067457023100E9B9A8B4B097847428B0F032166698114479DFDA47DC5E11BFF00A06888164CAD3793B8C283148008F9193579C7D32FAF4AD1A9BFFDB236F148E3',
          signatures: [
            {
              pubKey: '035ABF78147D2CAB552A4CCE6067457023100E9B9A8B4B097847428B0F03216669',
              signature:
                'dd4aeb145ed63b11863b54f24afb42d7753d87e1bca0efca7271db4f1fc084daa5d6f4665abc78d28c726a554d6c51ce024535ff35b338ca783886235dc8105c01',
              // signature:
              //   '3045022100DD4AEB145ED63B11863B54F24AFB42D7753D87E1BCA0EFCA7271DB4F1FC084DA02205A290B99A543872D738D95AAB293AE30B869A6E7799567714799D869726E30E5',
              hash: '58c998d6e65a841511d226524d0c1eff1628bbfc603b6c3f5ca02e148db3ca8e',
            },
          ],
          network: {
            provider: 'wss://s.altnet.rippletest.net/',
          },
        };
        const SignTransaction = promisify(client.SignTransaction.bind(client));

        const { serialized, hash } = await SignTransaction(req);
        expect(serialized).toEqual(
          '1200002280000000240124705A201B0124E27A6140000000000F424068400000000000000C7321035ABF78147D2CAB552A4CCE6067457023100E9B9A8B4B097847428B0F0321666974473045022100DD4AEB145ED63B11863B54F24AFB42D7753D87E1BCA0EFCA7271DB4F1FC084DA02205A290B99A543872D738D95AAB293AE30B869A6E7799567714799D869726E30E58114479DFDA47DC5E11BFF00A06888164CAD3793B8C283148008F9193579C7D32FAF4AD1A9BFFDB236F148E3',
        );
        expect(hash).toEqual('E1F5175BE97CE23E12797DC339B551A29A1013A7DA3EB44C38094DE7C1BF8164');
      });

      test('multisig payment', async () => {
        const req = {
          serialized:
            '12000022800000002401247060201B0127E9276140000000000F424068400000000000002473008114479DFDA47DC5E11BFF00A06888164CAD3793B8C28314AE53524B781412EA1ED3BAB93913AFA763C21148F3E01073210366CCF6281AF55D8BD53D19940448FBE9F2722D7B09BDE7F43F758A3DDFF0651074008114AE53524B781412EA1ED3BAB93913AFA763C21148E1E010732102AA3C6C46F2A5B6F72CDC2048A502BE9486972D0430EA88DF89837A028FBD05777400811469CEB227527043E66B6829CE06DCE80FEC165331E1F1',
          signatures: [
            {
              hash: 'c136af9dfd3aa4106d6ae4beade010c6292eee8df1073e5f377bede37fec60',
              pubKey: '0366CCF6281AF55D8BD53D19940448FBE9F2722D7B09BDE7F43F758A3DDFF06510',
              signature:
                'b4824e233d8c1ba664bee9705ad99fbff34e78c30550f6def9e4563b31037222dcb3926173a004238e31f433f94d6216c74c4c91ce21727f34a16468a499aa7e01',
            },
            {
              hash: '17c283a4302b96e218d324f9735dfec9b2df463d0bc5ffbbde63117aea628ab1',
              pubKey: '02AA3C6C46F2A5B6F72CDC2048A502BE9486972D0430EA88DF89837A028FBD0577',
              signature:
                '305fd67076182b80d7a37c3517086271c07d20d9b1bdea4820740be47f5053bd779e444ca56123495115787c04a60b8307524d696afc7ea6025d9d8c1627483f01',
            },
          ],
          network: {
            provider: 'wss://s.altnet.rippletest.net/',
          },
        };
        const SignTransaction = promisify(client.SignTransaction.bind(client));

        const { serialized, hash } = await SignTransaction(req);
        expect(serialized).toEqual(
          '12000022800000002401247060201B0127E9276140000000000F424068400000000000002473008114479DFDA47DC5E11BFF00A06888164CAD3793B8C28314AE53524B781412EA1ED3BAB93913AFA763C21148F3E010732102AA3C6C46F2A5B6F72CDC2048A502BE9486972D0430EA88DF89837A028FBD0577744630440220305FD67076182B80D7A37C3517086271C07D20D9B1BDEA4820740BE47F5053BD0220779E444CA56123495115787C04A60B8307524D696AFC7EA6025D9D8C1627483F811469CEB227527043E66B6829CE06DCE80FEC165331E1E01073210366CCF6281AF55D8BD53D19940448FBE9F2722D7B09BDE7F43F758A3DDFF0651074473045022100B4824E233D8C1BA664BEE9705AD99FBFF34E78C30550F6DEF9E4563B310372220220234C6D9E8C5FFBDC71CE0BCC06B29DE7F3629054E1272DBC8B30FA242B9C96C38114AE53524B781412EA1ED3BAB93913AFA763C21148E1F1',
        );
        expect(hash).toEqual('9A6D7A14E53A14AE4480F480A373F22F399284042C69A30D3E792630F07BF8B9');
      });
    });

    describe('Multisig', () => {
      test('buildTransaction', async () => {
        const req = {
          from: {
            address: 'rfXgErjK96k59evDnC22zX7vRo2hYaSiqc',
          },
          quantity: '1000000',
          destination: 'rGtkPCrTgq5st3uSsyz5YnHMETYQdQofUS',
          signersCount: 2,
          params: {
            lastLedgerSequence: 19388357,
            fee: '36',
            sequence: 19165280,
          },
          network: {
            provider: 'wss://s.altnet.rippletest.net/',
          },
        };
        const BuildPaymentTransaction = promisify(client.BuildPaymentTransaction.bind(client));

        const { serialized } = await BuildPaymentTransaction(req);
        expect(serialized).toEqual(
          '12000022800000002401247060201B0127D7C56140000000000F42406840000000000000248114479DFDA47DC5E11BFF00A06888164CAD3793B8C28314AE53524B781412EA1ED3BAB93913AFA763C21148',
        );
      });

      test('hashForSignature', async () => {
        const req = {
          serialized:
            '12000022800000002401247060201B0127E9276140000000000F42406840000000000000248114479DFDA47DC5E11BFF00A06888164CAD3793B8C28314AE53524B781412EA1ED3BAB93913AFA763C21148',
          accounts: [
            {
              pubKey: '0366CCF6281AF55D8BD53D19940448FBE9F2722D7B09BDE7F43F758A3DDFF06510',
              address: 'rGtkPCrTgq5st3uSsyz5YnHMETYQdQofUS',
            },
            {
              pubKey: '02AA3C6C46F2A5B6F72CDC2048A502BE9486972D0430EA88DF89837A028FBD0577',
              address: 'rweTZdJmr67cVuWnqqUQbUqcDGugpnRehc',
            },
          ],
          signersCount: 2,
          network: {
            provider: 'wss://s.altnet.rippletest.net/',
          },
        };

        const HashForSignature = promisify(client.HashForSignature.bind(client));
        const { serialized, signatures } = await HashForSignature(req);
        expect(serialized).toEqual(
          '12000022800000002401247060201B0127E9276140000000000F424068400000000000002473008114479DFDA47DC5E11BFF00A06888164CAD3793B8C28314AE53524B781412EA1ED3BAB93913AFA763C21148F3E01073210366CCF6281AF55D8BD53D19940448FBE9F2722D7B09BDE7F43F758A3DDFF0651074008114AE53524B781412EA1ED3BAB93913AFA763C21148E1E010732102AA3C6C46F2A5B6F72CDC2048A502BE9486972D0430EA88DF89837A028FBD05777400811469CEB227527043E66B6829CE06DCE80FEC165331E1F1',
        );
        expect(signatures).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              hash: 'c136af9dfd3aa4106d6ae4beade010c6292eee8df1073e5f377bede37fec60',
              pubKey: '0366CCF6281AF55D8BD53D19940448FBE9F2722D7B09BDE7F43F758A3DDFF06510',
            }),
            expect.objectContaining({
              hash: '17c283a4302b96e218d324f9735dfec9b2df463d0bc5ffbbde63117aea628ab1',
              pubKey: '02AA3C6C46F2A5B6F72CDC2048A502BE9486972D0430EA88DF89837A028FBD0577',
            }),
          ]),
        );
      });

      test('signTransaction', async () => {
        const req = {
          serialized:
            '12000022800000002401247060201B0127E9276140000000000F424068400000000000002473008114479DFDA47DC5E11BFF00A06888164CAD3793B8C28314AE53524B781412EA1ED3BAB93913AFA763C21148F3E01073210366CCF6281AF55D8BD53D19940448FBE9F2722D7B09BDE7F43F758A3DDFF0651074008114AE53524B781412EA1ED3BAB93913AFA763C21148E1E010732102AA3C6C46F2A5B6F72CDC2048A502BE9486972D0430EA88DF89837A028FBD05777400811469CEB227527043E66B6829CE06DCE80FEC165331E1F1',
          signatures: [
            {
              hash: 'c136af9dfd3aa4106d6ae4beade010c6292eee8df1073e5f377bede37fec60',
              pubKey: '0366CCF6281AF55D8BD53D19940448FBE9F2722D7B09BDE7F43F758A3DDFF06510',
              signature:
                'b4824e233d8c1ba664bee9705ad99fbff34e78c30550f6def9e4563b31037222dcb3926173a004238e31f433f94d6216c74c4c91ce21727f34a16468a499aa7e01',
            },
            {
              hash: '17c283a4302b96e218d324f9735dfec9b2df463d0bc5ffbbde63117aea628ab1',
              pubKey: '02AA3C6C46F2A5B6F72CDC2048A502BE9486972D0430EA88DF89837A028FBD0577',
              signature:
                '305fd67076182b80d7a37c3517086271c07d20d9b1bdea4820740be47f5053bd779e444ca56123495115787c04a60b8307524d696afc7ea6025d9d8c1627483f01',
            },
          ],
          network: {
            provider: 'wss://s.altnet.rippletest.net/',
          },
        };
        const SignTransaction = promisify(client.SignTransaction.bind(client));

        const { serialized, hash } = await SignTransaction(req);
        expect(serialized).toEqual(
          '12000022800000002401247060201B0127E9276140000000000F424068400000000000002473008114479DFDA47DC5E11BFF00A06888164CAD3793B8C28314AE53524B781412EA1ED3BAB93913AFA763C21148F3E010732102AA3C6C46F2A5B6F72CDC2048A502BE9486972D0430EA88DF89837A028FBD0577744630440220305FD67076182B80D7A37C3517086271C07D20D9B1BDEA4820740BE47F5053BD0220779E444CA56123495115787C04A60B8307524D696AFC7EA6025D9D8C1627483F811469CEB227527043E66B6829CE06DCE80FEC165331E1E01073210366CCF6281AF55D8BD53D19940448FBE9F2722D7B09BDE7F43F758A3DDFF0651074473045022100B4824E233D8C1BA664BEE9705AD99FBFF34E78C30550F6DEF9E4563B310372220220234C6D9E8C5FFBDC71CE0BCC06B29DE7F3629054E1272DBC8B30FA242B9C96C38114AE53524B781412EA1ED3BAB93913AFA763C21148E1F1',
        );
        expect(hash).toEqual('9A6D7A14E53A14AE4480F480A373F22F399284042C69A30D3E792630F07BF8B9');
      });
    });

    describe('DecodeTransaction', () => {
      test('account payment', async () => {
        const req = {
          serialized:
            '1200002280000000240124705A201B0124E27A6140000000000F424068400000000000000C7321035ABF78147D2CAB552A4CCE6067457023100E9B9A8B4B097847428B0F0321666974473045022100DD4AEB145ED63B11863B54F24AFB42D7753D87E1BCA0EFCA7271DB4F1FC084DA02205A290B99A543872D738D95AAB293AE30B869A6E7799567714799D869726E30E58114479DFDA47DC5E11BFF00A06888164CAD3793B8C283148008F9193579C7D32FAF4AD1A9BFFDB236F148E3',
          network: {
            provider: 'wss://s.altnet.rippletest.net/',
          },
        };

        const DecodeTransaction = promisify(client.DecodeTransaction.bind(client));
        const response = await DecodeTransaction(req);

        expect(response).toEqual(
          expect.objectContaining({
            fee: '12',
            sequence: '19165274',
            lastLedgerSequence: '19194490',
          }),
        );
      });

      test('multisig payment', async () => {
        const req = {
          serialized:
            '12000022800000002401247060201B0127E9276140000000000F424068400000000000002473008114479DFDA47DC5E11BFF00A06888164CAD3793B8C28314AE53524B781412EA1ED3BAB93913AFA763C21148F3E010732102AA3C6C46F2A5B6F72CDC2048A502BE9486972D0430EA88DF89837A028FBD0577744630440220305FD67076182B80D7A37C3517086271C07D20D9B1BDEA4820740BE47F5053BD0220779E444CA56123495115787C04A60B8307524D696AFC7EA6025D9D8C1627483F811469CEB227527043E66B6829CE06DCE80FEC165331E1E01073210366CCF6281AF55D8BD53D19940448FBE9F2722D7B09BDE7F43F758A3DDFF0651074473045022100B4824E233D8C1BA664BEE9705AD99FBFF34E78C30550F6DEF9E4563B310372220220234C6D9E8C5FFBDC71CE0BCC06B29DE7F3629054E1272DBC8B30FA242B9C96C38114AE53524B781412EA1ED3BAB93913AFA763C21148E1F1',
          network: {
            provider: 'wss://s.altnet.rippletest.net/',
          },
        };

        const DecodeTransaction = promisify(client.DecodeTransaction.bind(client));
        const response = await DecodeTransaction(req);

        expect(response).toEqual(
          expect.objectContaining({
            fee: '36',
            sequence: '19165280',
            lastLedgerSequence: '19392807',
          }),
        );
      });
    });

    describe('RebuildTransaction', () => {
      test('account payment', async () => {
        const req = {
          serialized:
            '1200002280000000240124705A201B0124E27A6140000000000F424068400000000000000C7321035ABF78147D2CAB552A4CCE6067457023100E9B9A8B4B097847428B0F0321666974473045022100DD4AEB145ED63B11863B54F24AFB42D7753D87E1BCA0EFCA7271DB4F1FC084DA02205A290B99A543872D738D95AAB293AE30B869A6E7799567714799D869726E30E58114479DFDA47DC5E11BFF00A06888164CAD3793B8C283148008F9193579C7D32FAF4AD1A9BFFDB236F148E3',
          params: {
            fee: '12',
            sequence: '19165283',
            lastLedgerSequence: '19474602',
          },
          network: {
            provider: 'wss://s.altnet.rippletest.net/',
          },
        };

        const RebuildTransaction = promisify(client.RebuildTransaction.bind(client));
        const { serialized } = await RebuildTransaction(req);

        expect(serialized).toEqual(
          '12000022800000002401247063201B012928AA6140000000000F424068400000000000000C8114479DFDA47DC5E11BFF00A06888164CAD3793B8C283148008F9193579C7D32FAF4AD1A9BFFDB236F148E3',
        );
      });

      test('multisig payment', async () => {
        const req = {
          serialized:
            '12000022800000002401247060201B0127E9276140000000000F424068400000000000002473008114479DFDA47DC5E11BFF00A06888164CAD3793B8C28314AE53524B781412EA1ED3BAB93913AFA763C21148F3E010732102AA3C6C46F2A5B6F72CDC2048A502BE9486972D0430EA88DF89837A028FBD0577744630440220305FD67076182B80D7A37C3517086271C07D20D9B1BDEA4820740BE47F5053BD0220779E444CA56123495115787C04A60B8307524D696AFC7EA6025D9D8C1627483F811469CEB227527043E66B6829CE06DCE80FEC165331E1E01073210366CCF6281AF55D8BD53D19940448FBE9F2722D7B09BDE7F43F758A3DDFF0651074473045022100B4824E233D8C1BA664BEE9705AD99FBFF34E78C30550F6DEF9E4563B310372220220234C6D9E8C5FFBDC71CE0BCC06B29DE7F3629054E1272DBC8B30FA242B9C96C38114AE53524B781412EA1ED3BAB93913AFA763C21148E1F1',
          params: {
            sequence: '19165283',
            lastLedgerSequence: '19475278',
          },
          network: {
            provider: 'wss://s.altnet.rippletest.net/',
          },
        };

        const RebuildTransaction = promisify(client.RebuildTransaction.bind(client));
        const { serialized } = await RebuildTransaction(req);

        expect(serialized).toEqual(
          '12000022800000002401247063201B01292B4E6140000000000F42406840000000000000248114479DFDA47DC5E11BFF00A06888164CAD3793B8C28314AE53524B781412EA1ED3BAB93913AFA763C21148',
        );
      });
    });
  });
});
