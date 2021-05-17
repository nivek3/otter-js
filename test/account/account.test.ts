import 'dotenv/config';
import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { ChainStateProvider } from '../../src/providers/chain-state';
import { grpcServer } from '../../src/services/grpc';

const PROTO_PATH = path.join(__dirname, '../../proto/account.proto');
var packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
});
var Account = (grpc.loadPackageDefinition(packageDefinition) as any).account.Account;

let client: any;

describe('Account service', () => {
  describe('BuildAccount', () => {    
    beforeEach(async () => {
      await grpcServer.start();
      client = new Account(`localhost:${process.env.GRPC_PORT}`, grpc.credentials.createInsecure());
    });
  
    afterEach(async () => {
      client?.close();
      await grpcServer.stop();
      jest.resetAllMocks();
    });

    test('invalid params, expect code, details, metadata', (done) => {
      client.DeployAccount(
        {
          payload: {
            keys: [
              '02f4147da97162a214dbe25828ee4c4acc4dc721cd0c15b2761b43ed0292ed82b5',
              '0377155e520059d3b85c6afc5c617b7eb519afadd0360f1ef03aff3f7e3f5438dd',
              '02f44bce3eecd274e7aa24ec975388d12905dfc670a99b16e1d968e6ab5f69b266',
            ],
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

    test('valid params, expect address', (done) => {
      const address = '0xeaf7b9d6da73ff19e370736cb6c6743bc87c8762';
      jest.spyOn(ChainStateProvider, 'deployAccount').mockResolvedValue(address);
      client.DeployAccount(
        {
          payload: {
            keys: [
              '02f4147da97162a214dbe25828ee4c4acc4dc721cd0c15b2761b43ed0292ed82b5',
              '0377155e520059d3b85c6afc5c617b7eb519afadd0360f1ef03aff3f7e3f5438dd',
              '02f44bce3eecd274e7aa24ec975388d12905dfc670a99b16e1d968e6ab5f69b266',
            ],
          },
          network: {
            platform: 'ethereum',
            params: {
              rpcURI: 'https://kovan.infura.io/v3/31a18f4a8bd14b56a4fb9ca9a818c7fa',
            },
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
});
