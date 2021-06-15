// import rp from 'request-promise';
// import { Accounts } from 'web3-eth-accounts';
// import { Contract } from 'web3-eth-contract';
import { bufferToHex, pubToAddress, toChecksumAddress } from 'ethereumjs-util';
import { ec as EC } from 'elliptic';
const ec = new EC('secp256k1');

import { DeployAccountRequest } from '../../../__proto__/ethereum/index';

export class Provider {
  deployAccount(req: DeployAccountRequest): string {
    const { key } = req as Required<DeployAccountRequest>;
    const pair = ec.keyFromPublic(key, 'hex');
    const decompose = pair.getPublic(false, 'hex');
    const address = bufferToHex(pubToAddress(Buffer.from(decompose, 'hex'), true));
    const bip55 = toChecksumAddress(address);
    return bip55;
  }
}

export const provider = new Provider();
