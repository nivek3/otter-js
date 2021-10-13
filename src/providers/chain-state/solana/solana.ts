import { TransactionReply } from '../../../__proto__/common/types';
import {
  DeployAccountRequest,
  SendTransactionRequest,
  SignTransactionRequest,
  BuildTransferTransactionRequest,
  BuildTokenTransferTransactionRequest,
  DecodeTransactionRequest,
  TransactionParams,
  RebuildTransactionRequest
} from '../../../__proto__/solana/types';

import {
  SolanaRefSchema,
  DeployAccountRequestSchema,
  BuildTransferTransactionRequestSchema,
  BuildTokenTransferTransactionRequestSchema,
  SignTransactionRequestSchema,
  SendTransactionRequestSchema,
  DecodeTransactionRequestSchema,
  RebuildTransactionRequestSchema
} from './solana.schema';

import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction
} from '@solana/web3.js';
import { 
  Token, 
  ASSOCIATED_TOKEN_PROGRAM_ID, 
  TOKEN_PROGRAM_ID 
} from '@solana/spl-token';

import BigNumber from 'bignumber.js';
import { Validator } from '../../../utils/ajv';
import { AppError, errors } from './../../../error';

const bs58 = require('bs58')
const validator = new Validator({ schemas: [SolanaRefSchema] });

export class Provider {

  deployAccount(req: DeployAccountRequest): string {
    validator.assert(DeployAccountRequestSchema, req);
    const { key } = req as Required<DeployAccountRequest>
    return bs58.encode(Buffer.from(key, 'hex'))
  }

  async buildTransferTransaction(req: BuildTransferTransactionRequest): Promise<TransactionReply> {

    validator.assert(BuildTransferTransactionRequestSchema, req);

    const { from, to, quantity, network, params } = req as Required<BuildTransferTransactionRequest>;
    const fromPubkey = new PublicKey(from);
    const toPubkey = new PublicKey(to);

    // 1. Build
    const transaction = new Transaction();
    transaction.feePayer = fromPubkey
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: fromPubkey,
        toPubkey: toPubkey,
        lamports: +quantity
      })
    );

    if (!params?.recentBlockhash) {
      if (!network) throw new AppError(errors.INVALID_NETWORK);
      const { provider } = network!;
      const connection = new Connection(provider!, 'confirmed');
      const blockhash = (await connection.getRecentBlockhash()).blockhash
      transaction.recentBlockhash = blockhash
    } else {
      transaction.recentBlockhash = params?.recentBlockhash
    }

    // 2. Serialized
    const serialized = transaction.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('hex');
    const hash = transaction.compileMessage().serialize().toString('hex')
    const signature = {
      hash
    }

    return {
      serialized: serialized,
      signatures: [
        signature
      ]
    };
  }

  signTransaction(req: SignTransactionRequest): TransactionReply {
    validator.assert(SignTransactionRequestSchema, req);

    const { serialized, signatures } = req as Required<SignTransactionRequest>;
    const transaction = Transaction.from(Buffer.from(serialized, 'hex'));
    const publicKey = transaction.feePayer as PublicKey;
    const signatureData = signatures[0].signature as string;
    transaction.addSignature(publicKey, Buffer.from(signatureData, 'hex'));

    return {
      serialized: transaction.serialize().toString('hex'),
      hash: bs58.encode(transaction.signature) // TxId is a 64-byte Solana transaction signature
    };
  }

  async sendTransaction(req: SendTransactionRequest): Promise<TransactionReply> {
    validator.assert(SendTransactionRequestSchema, req);

    const { serialized, network } = req as Required<SendTransactionRequest>;
    const { provider } = network!;
    const connection = new Connection(provider!, 'confirmed');

    return new Promise((resolve, reject) => {
      connection
        .sendRawTransaction(Buffer.from(serialized, 'hex'))
        .then(async hash => {
          resolve({ hash })
        })
        .catch(e => reject(e));
    });
  }

  async buildTokenTransferTransaction(req: BuildTokenTransferTransactionRequest) {
    validator.assert(BuildTokenTransferTransactionRequestSchema, req);

    const { from, to, mintAddress, decimals, quantity, network, params } = req as Required<BuildTokenTransferTransactionRequest>;
    const { provider } = network!;
    const connection = new Connection(provider!, 'confirmed');

    // Basic info
    const fromWallet = new PublicKey(from);
    const toWallet = new PublicKey(to);
    const mint = new PublicKey(mintAddress);

    // Token Transfer info
    const amount = new BigNumber(quantity).toNumber()
    let fromTokenAccount: PublicKey | null = null;
    let toTokenAccount: PublicKey | null = null;

    let shouldCreateNewTokenAccount: Boolean = false
    let createNewAccountTransfer: any;
    let tokenTransfer: any

    // Config from token account
    if (await isTokenPubkey(connection, fromWallet)) {
      // fromTokenAccount = fromWallet as any;
      // NOTE: It will be failed when parameter `from` is token address
      throw new AppError(errors.INVALID_ARGUMENT, { details: "Parameter from shouldn't be token address" });
    } else {
      const fromTokenAccounts = await getTokenAccountsByOwner(connection, fromWallet, mint);
      if (fromTokenAccounts == null) {
        throw new AppError(errors.INVALID_ARGUMENT, { details: "From token accounts not found" });
      } else {
        fromTokenAccount = fromTokenAccounts![0].pubkey;
        for (const tokenAccount of fromTokenAccounts) {
          if (tokenAccount.account.data.parsed.info.mint === mint) {
            fromTokenAccount = tokenAccount.pubkey
          }
        }
      }
    }

    // Config to token account
    if (await isTokenPubkey(connection, toWallet)) {
      toTokenAccount = toWallet as any;
    } else {
      const toTokenAccounts = await getTokenAccountsByOwner(connection, toWallet, mint);

      if (toTokenAccounts == null) {
        // If receiver don't have a token address, sender(payer) should creat a new token account for receiver

        // 1. generate a new token account
        toTokenAccount = await findAssociatedTokenAddress(toWallet, mint);

        // 2. make this new token account be associated to 'Associated Token Account Program'
        createNewAccountTransfer = Token.createAssociatedTokenAccountInstruction(
          ASSOCIATED_TOKEN_PROGRAM_ID,
          TOKEN_PROGRAM_ID,
          mint,
          toTokenAccount!,
          toWallet,
          fromWallet
        )
        shouldCreateNewTokenAccount = true
      } else {
        for (const tokenAccount of toTokenAccounts) {
          if (tokenAccount.account.data.parsed.info.mint == mint) {
            toTokenAccount = tokenAccount.pubkey
          }
        }
      }
    }

    /// https://github.com/solana-labs/solana-program-library/blob/master/token/program/src/instruction.rs
    /// This instruction differs from Transfer in that the token mint and
    /// decimals value is checked by the caller.  This may be useful when
    /// creating transactions offline or within a hardware wallet.
    tokenTransfer = Token.createTransferCheckedInstruction(
      TOKEN_PROGRAM_ID,
      fromTokenAccount!,
      mint,
      toTokenAccount!,
      fromWallet,
      [],
      amount,
      new BigNumber(decimals).toNumber()
    )

    const transaction = new Transaction()
    if (!params?.recentBlockhash) { 
      const blockhash = (await connection.getRecentBlockhash()).blockhash
      transaction.recentBlockhash = blockhash
    } else {
      transaction.recentBlockhash = params?.recentBlockhash
    }
    transaction.feePayer = fromWallet;

    if (shouldCreateNewTokenAccount) transaction.add(createNewAccountTransfer);
    if (tokenTransfer) transaction.add(tokenTransfer);

    const serialized = transaction.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('hex');
    const hash = transaction.compileMessage().serialize().toString('hex').replace('0101010', '0100010')
    const signature = { hash }

    return {
      serialized: serialized,
      signatures: [
        signature
      ]
    };
  }

  decodeTransaction(req: DecodeTransactionRequest): TransactionParams {
    validator.assert(DecodeTransactionRequestSchema, req);

    const { serialized } = req as Required<DecodeTransactionRequest>;
    const transaction = Transaction.from(Buffer.from(serialized, 'hex'));
    return { recentBlockhash: transaction.recentBlockhash };
  }

  async rebuildTransaction(req: RebuildTransactionRequest): Promise<TransactionReply> {
    validator.assert(RebuildTransactionRequestSchema, req);

    const { serialized, params = {}, network } = req as Required<RebuildTransactionRequest>;
    const transaction = Transaction.from(Buffer.from(serialized, 'hex'));

    if (!params?.recentBlockhash) {
      if (!network) throw new AppError(errors.INVALID_NETWORK);
      const { provider } = network!;
      const connection = new Connection(provider!, 'confirmed');
      const blockhash = (await connection.getRecentBlockhash()).blockhash
      transaction.recentBlockhash = blockhash
    } else {
      transaction.recentBlockhash = params?.recentBlockhash
    }

    const reserialized = transaction.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('hex');
    const hash = transaction.compileMessage().serialize().toString('hex')
    const signature = { hash }

    return {
      serialized: reserialized,
      signatures: [signature]
    };
  }
};

async function isTokenPubkey(connection: Connection, pubkey: PublicKey) {
  const accountInfo = await connection.getAccountInfo(pubkey, 'recent')
  return accountInfo && accountInfo!.data.length != 0 
}

async function getTokenAccountsByOwner(connection: Connection, owener: PublicKey, mint: PublicKey) {
  const tokenAccounts = (await connection.getParsedTokenAccountsByOwner(owener, { mint: mint, programId: TOKEN_PROGRAM_ID }, 'recent')).value
  if (Array.isArray(tokenAccounts) && tokenAccounts.length !== 0) {
    return tokenAccounts
  } else {
    return null
  }
}

async function findAssociatedTokenAddress(pubkey: PublicKey, mint: PublicKey) {
  const addresses = await PublicKey.findProgramAddress(
    [pubkey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )
  return addresses[0]
}

export const provider = new Provider();
