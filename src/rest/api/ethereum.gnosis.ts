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

router.post('/buildMultisigTransferInput', async function (req: Request, res: Response, next) {
  try {
    const result = await provider.buildMultisigTransferInput(req.body);
    return res.json(result);
  } catch (err) {
    logger.error('BuildMultisigTransferInput =>', err);
    return next(err);
  }
});

router.post('/buildMultisigInput', async function (req: Request, res: Response, next) {
  try {
    const result = await provider.buildMultisigInput(req.body);
    return res.json(result);
  } catch (err) {
    logger.error('BuildMultisigInput =>', err);
    return next(err);
  }
});

router.post('/signMultisigInput', async function (req: Request, res: Response, next) {
  try {
    const result = provider.signMultisigInput(req.body);
    return res.json(result);
  } catch (err) {
    logger.error('SignMultisigInput =>', err);
    return next(err);
  }
});

router.post('/buildMultisigTransaction', async function (req: Request, res: Response, next) {
  try {
    const result = await provider.buildMultisigTransaction(req.body);
    return res.json(result);
  } catch (err) {
    logger.error('BuildMultisigTransaction =>', err);
    return next(err);
  }
});

router.post('/buildMultisigERC20TransferInput', async function (req: Request, res: Response, next) {
  try {
    const result = await provider.buildMultisigERC20TransferInput(req.body);
    return res.json(result);
  } catch (err) {
    logger.error('BuildMultisigERC20TransferInput =>', err);
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
