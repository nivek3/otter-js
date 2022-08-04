import { Request, Response } from 'express';
const router = require('express').Router({ mergeParams: true });
import { provider } from '@src/providers/chain-state/ethereum/core/ethereum';
import logger from '@src/logger';

router.post('/deployAccount', async function (req: Request, res: Response, next) {
  try {
    const account = provider.deployAccount(req.body);
    return res.json({
      address: account,
    });
  } catch (err) {
    logger.error('deployAccount =>', err);
    return next(err);
  }
});

router.post('/buildTransaction', async function (req: Request, res: Response, next) {
  try {
    const data = await provider.buildTransaction(req.body);
    return res.json(data);
  } catch (err) {
    logger.error('BuildTransaction =>', err);
    return next(err);
  }
});

router.post('/buildTransferTransaction', async function (req: Request, res: Response, next) {
  try {
    const data = await provider.buildTransferTransaction(req.body);
    return res.json(data);
  } catch (err) {
    logger.error('buildTransferTransaction =>', err);
    return next(err);
  }
});

router.post('/buildERC20TransferTransaction', async function (req: Request, res: Response, next) {
  try {
    const data = await provider.buildERC20TransferTransaction(req.body);
    return res.json(data);
  } catch (err) {
    logger.error('buildERC20TransferTransaction =>', err);
    return next(err);
  }
});

router.post('/buildContractInput', async function (req: Request, res: Response, next) {
  try {
    const data = await provider.buildContractInput(req.body);
    return res.json(data);
  } catch (err) {
    logger.error('BuildContractInput =>', err);
    return next(err);
  }
});

router.post('/buildContractTransaction', async function (req: Request, res: Response, next) {
  try {
    const data = await provider.buildContractTransaction(req.body);
    return res.json(data);
  } catch (err) {
    logger.error('BuildContractTransaction =>', err);
    return next(err);
  }
});

router.post('/signTransaction', async function (req: Request, res: Response, next) {
  try {
    const tx = provider.signTransaction(req.body);
    return res.json(tx);
  } catch (err) {
    logger.error('signTransaction =>', err);
    return next(err);
  }
});

router.post('/sendTransaction', async function (req: Request, res: Response, next) {
  try {
    const tx = await provider.sendTransaction(req.body);
    return res.json(tx);
  } catch (err) {
    logger.error('sendTransaction =>', err);
    return next(err);
  }
});

router.post('/rebuildTransaction', async function (req: Request, res: Response, next) {
  try {
    const tx = await provider.rebuildTransaction(req.body);
    return res.json(tx);
  } catch (err) {
    logger.error('rebuildTransaction =>', err);
    return next(err);
  }
});

router.post('/hashForSignature', async function (req: Request, res: Response, next) {
  try {
    const result = provider.hashForSignature(req.body);
    return res.json(result);
  } catch (err) {
    logger.error('hashForSignature =>', err);
    return next(err);
  }
});

router.post('/decodeTransaction', async function (req: Request, res: Response, next) {
  try {
    const result = provider.decodeTransaction(req.body);
    return res.json(result);
  } catch (err) {
    logger.error('DecodeTransaction =>', err);
    return next(err);
  }
});

module.exports = {
  router: router,
  path: '/ethereum',
};
