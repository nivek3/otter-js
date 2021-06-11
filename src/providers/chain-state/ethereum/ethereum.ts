// import rp from 'request-promise';
// import { Accounts } from 'web3-eth-accounts';
// import { Contract } from 'web3-eth-contract';
import { bufferToHex, pubToAddress } from 'ethereumjs-util';
import { ec as EC } from 'elliptic';
const ec = new EC('secp256k1');

import { DeployAccountRequest } from '../../../__proto__/ethereum/index';

export class Provider {
  deployAccount(req: DeployAccountRequest): string {
    const { key } = req as Required<DeployAccountRequest>;
    const address = bufferToHex(pubToAddress(Buffer.from(ec.keyFromPublic(key, 'hex').getPublic(false, 'hex'), 'hex').slice(1)));
    return address;
  }
}

export const provider = new Provider();
