import { Request, Response } from 'express';
const router = require('express').Router({ mergeParams: true });
import { provider } from '@src/providers/chain-state/ethereum/gnosis/ethereum';
import logger from '@src/logger';

router.post('/buildAccountTransaction', async function (req: Request, res: Response, next) {
  try {
    const data = await provider.buildAccountTransaction(req.body);
    return res.json(data);
  } catch (err) {
    logger.info('buildAccountTransaction =>', err);
    return next(err);
  }
});

router.post('/buildMultisigTransferInput', async function (req: Request, res: Response, next) {
  try {
    const result = await provider.buildMultisigTransferInput(req.body);
    return res.json(result);
  } catch (err) {
    logger.info('buildMultisigTransferInput =>', err);
    return next(err);
  }
});

router.post('/signMultisigTransferInput', async function (req: Request, res: Response, next) {
  try {
    const result = provider.signMultisigTransferInput(req.body);
    return res.json(result);
  } catch (err) {
    logger.info('signMultisigTransferInput =>', err);
    return next(err);
  }
});

router.post('/buildMultisigTransferTransaction', async function (req: Request, res: Response, next) {
  try {
    const result = await provider.buildMultisigTransferTransaction(req.body);
    return res.json(result);
  } catch (err) {
    logger.info('buildMultisigTransferTransaction =>', err);
    return next(err);
  }
});

router.post('/buildMultisigERC20TransferInput', async function (req: Request, res: Response, next) {
  try {
    const result = await provider.buildMultisigERC20TransferInput(req.body);
    return res.json(result);
  } catch (err) {
    logger.info('buildMultisigERC20TransferInput =>', err);
    return next(err);
  }
});

router.post('/signMultisigERC20TransferInput', async function (req: Request, res: Response, next) {
  try {
    const result = await provider.signMultisigERC20TransferInput(req.body);
    return res.json(result);
  } catch (err) {
    logger.info('signMultisigERC20TransferInput =>', err);
    return next(err);
  }
});

// router.post('/hashForSignature', async function (req: Request, res: Response, next) {
//   try {
//     const result = provider.hashForSignature(req.body);
//     return res.json(result);
//   } catch (err) {
//     logger.info('hashForSignature =>', err);
//     return next(err);
//   }
// });

// router.post('/decodeTransaction', async function (req: Request, res: Response, next) {
//   try {
//     const result = provider.decodeTransaction(req.body);
//     return res.json(result);
//   } catch (err) {
//     logger.info('DecodeTransaction =>', err);
//     return next(err);
//   }
// });

module.exports = {
  router: router,
  path: '/ethereum/gnosis',
};
