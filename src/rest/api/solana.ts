import { Request, Response } from 'express';
const router = require('express').Router({ mergeParams: true });
import { provider } from '../../providers/chain-state/solana/solana';
import logger from '../../logger';

router.post('/deployAccount', async function (req: Request, res: Response, next) {
  try {
    const account = provider.deployAccount(req.body);
    return res.json({
      address: account,
    });
  } catch (err) {
    logger.info('deployAccount =>', err);
    return next(err);
  }
});

router.post('/buildTransferTransaction', async function (req: Request, res: Response, next) {
  try {
    const data = await provider.buildTransferTransaction(req.body)
    return res.json(data);
  } catch (err) {
    logger.info('BuildTransferTransaction =>', err);
    return next(err)
  }
});

router.post('/signTransaction', async function (req: Request, res: Response, next) {
  try {
    const data = provider.signTransaction(req.body);
    return res.json(data);
  } catch (err) {
    logger.info('SignTransaction =>', err);
    return next(err);
  }
});

router.post('/sendTransaction', async function (req: Request, res: Response, next) {
  try {
    const tx = await provider.sendTransaction(req.body);
    return res.json(tx);
  } catch (err) {
    logger.info('SendTransaction =>', err);
    return next(err);
  }
});

router.post('/buildTokenTransferTransaction', async function (req: Request, res: Response, next) {
  try {
    const tx = await provider.buildTokenTransferTransaction(req.body);
    return res.json(tx);
  } catch (err) {
    logger.info('BuildTokenTransferTransaction =>', err);
    return next(err);
  }
});

router.post('/decodeTransaction', async function (req: Request, res: Response, next) {
  try {
    const result = provider.decodeTransaction(req.body);
    return res.json(result);
  } catch (err) {
    logger.info('DecodeTransaction =>', err);
    return next(err);
  }
});

router.post('/rebuildTransaction', async function (req: Request, res: Response, next) {
  try {
    const tx = await provider.rebuildTransaction(req.body);
    return res.json(tx);
  } catch (err) {
    logger.info('rebuildTransaction =>', err);
    return next(err);
  }
});


module.exports = {
  router: router,
  path: '/solana',
};