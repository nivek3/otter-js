import { Request, Response } from 'express';
const router = require('express').Router({ mergeParams: true });
import { provider } from '../../providers/chain-state/tron/tron';
import logger from '../../logger';

router.post('/deployAccount', async function (req: Request, res: Response, next) {
  try {
    const account = provider.deployAccount(req.body);
    return res.json({
      address: account,
    });
  } catch (err) {
    logger.error('DeployAccount =>', err);
    return next(err);
  }
});

router.post('/buildTransferTransaction', async function (req: Request, res: Response, next) {
  try {
    const result = await provider.buildTransferTransaction(req.body);
    return res.json(result);
  } catch (err) {
    logger.error('BuildTransferTransaction =>', err);
    return next(err);
  }
});

router.post('/buildTRC10TransferTransaction', async function (req: Request, res: Response, next) {
  try {
    const result = await provider.buildTRC10TransferTransaction(req.body);
    return res.json(result);
  } catch (err) {
    logger.error('BuildTRC10TransferTransaction =>', err);
    return next(err);
  }
});

router.post('/buildTRC20TransferTransaction', async function (req: Request, res: Response, next) {
  try {
    const result = await provider.buildTRC20TransferTransaction(req.body);
    return res.json(result);
  } catch (err) {
    logger.error('BuildTRC20TransferTransaction =>', err);
    return next(err);
  }
});

router.post('/signTransaction', async function (req: Request, res: Response, next) {
  try {
    const result = await provider.signTransaction(req.body);
    return res.json(result);
  } catch (err) {
    logger.error('SignTransaction =>', err);
    return next(err);
  }
});

router.post('/sendTransaction', async function (req: Request, res: Response, next) {
  try {
    const result = await provider.sendTransaction(req.body);
    return res.json(result);
  } catch (err) {
    logger.error('SendTransaction =>', err);
    return next(err);
  }
});

router.post('/decodeTransaction', async function (req: Request, res: Response, next) {
  try {
    const result = await provider.decodeTransaction(req.body);
    return res.json(result);
  } catch (err) {
    logger.error('DecodeTransaction =>', err);
    return next(err);
  }
});

router.post('/rebuildTransaction', async function (req: Request, res: Response, next) {
  try {
    const result = await provider.rebuildTransaction(req.body);
    return res.json(result);
  } catch (err) {
    logger.error('RebuildTransaction =>', err);
    return next(err);
  }
});

module.exports = {
  router: router,
  path: '/tron',
};
