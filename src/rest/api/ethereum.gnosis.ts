import { Request, Response } from 'express';
const router = require('express').Router({ mergeParams: true });
import { provider } from '@src/providers/chain-state/ethereum/gnosis/ethereum';
import logger from '@src/logger';

router.post('/getAccountAddress', async function (req: Request, res: Response, next) {
  try {
    const data = await provider.getAccountAddress(req.body);
    return res.json(data);
  } catch (err) {
    logger.error('getAccountAddress =>', err);
    return next(err);
  }
});

router.post('/buildAccountTransaction', async function (req: Request, res: Response, next) {
  try {
    const data = await provider.buildAccountTransaction(req.body);
    return res.json(data);
  } catch (err) {
    logger.error('BuildAccountTransaction =>', err);
    return next(err);
  }
});

router.post('/buildTransferInput', async function (req: Request, res: Response, next) {
  try {
    const result = await provider.buildTransferInput(req.body);
    return res.json(result);
  } catch (err) {
    logger.error('BuildTransferInput =>', err);
    return next(err);
  }
});

router.post('/buildInput', async function (req: Request, res: Response, next) {
  try {
    const result = await provider.buildInput(req.body);
    return res.json(result);
  } catch (err) {
    logger.error('BuildInput =>', err);
    return next(err);
  }
});

router.post('/signInput', async function (req: Request, res: Response, next) {
  try {
    const result = provider.signInput(req.body);
    return res.json(result);
  } catch (err) {
    logger.error('SignInput =>', err);
    return next(err);
  }
});

router.post('/buildTransaction', async function (req: Request, res: Response, next) {
  try {
    const result = await provider.buildTransaction(req.body);
    return res.json(result);
  } catch (err) {
    logger.error('BuildTransaction =>', err);
    return next(err);
  }
});

router.post('/buildERC20TransferInput', async function (req: Request, res: Response, next) {
  try {
    const result = await provider.buildERC20TransferInput(req.body);
    return res.json(result);
  } catch (err) {
    logger.error('BuildERC20TransferInput =>', err);
    return next(err);
  }
});

router.post('/buildAddOwnerWithThresholdInput', async function (req: Request, res: Response, next) {
  try {
    const result = await provider.buildAddOwnerWithThresholdInput(req.body);
    return res.json(result);
  } catch (err) {
    logger.error('BuildAddOwnerWithThresholdInput =>', err);
    return next(err);
  }
});

router.post('/buildChangeThresholdInput', async function (req: Request, res: Response, next) {
  try {
    const result = await provider.buildChangeThresholdInput(req.body);
    return res.json(result);
  } catch (err) {
    logger.error('BuildChangeThresholdInput =>', err);
    return next(err);
  }
});

router.post('/buildRemoveOwnerInput', async function (req: Request, res: Response, next) {
  try {
    const result = await provider.buildRemoveOwnerInput(req.body);
    return res.json(result);
  } catch (err) {
    logger.error('BuildRemoveOwnerInput =>', err);
    return next(err);
  }
});

module.exports = {
  router: router,
  path: '/ethereum/gnosis',
};
