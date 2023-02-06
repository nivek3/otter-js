import { Request, Response } from 'express';
const router = require('express').Router({ mergeParams: true });
import { provider } from '@src/providers/chain-state/avalanche/avax';
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

router.post('/buildAVAXTransferTransaction', async function (req: Request, res: Response, next) {
  try {
    const result = await provider.buildAVAXTransferTransaction(req.body);
    return res.json(result);
  } catch (err) {
    logger.error('buildAVAXTransferTransaction =>', err);
    return next(err);
  }
});

router.post('/signTransaction', async function (req: Request, res: Response, next) {
  try {
    const result = await provider.signTransaction(req.body);
    return res.json(result);
  } catch (err) {
    logger.error('signTransaction =>', err);
    return next(err);
  }
});

router.post('/sendTransaction', async function (req: Request, res: Response, next) {
  try {
    const result = await provider.sendTransaction(req.body);
    return res.json(result);
  } catch (err) {
    logger.error('sendTransaction =>', err);
    return next(err);
  }
});

router.post('/decodeTransaction', async function (req: Request, res: Response, next) {
  try {
    const result = await provider.decodeTransaction(req.body);
    return res.json(result);
  } catch (err) {
    logger.error('decodeTransaction =>', err);
    return next(err);
  }
});

module.exports = {
  router: router,
  path: '/avalanche',
};
