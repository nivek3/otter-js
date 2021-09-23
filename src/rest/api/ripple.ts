import { Request, Response } from 'express';
const router = require('express').Router({ mergeParams: true });
import { provider } from '../../providers/chain-state/ripple/ripple';
import logger from '../../logger';

router.post('/deployAccount', async function (req: Request, res: Response, next) {
  try {
    const account = await provider.deployAccount(req.body);
    return res.json({
      address: account,
    });
  } catch (err) {
    logger.info('DeployAccount =>', err);
    return next(err);
  }
});

router.post('/buildPaymentTransaction', async function (req: Request, res: Response, next) {
  try {
    const result = await provider.buildPaymentTransaction(req.body);
    return res.json(result);
  } catch (err) {
    logger.info('BuildPaymentTransaction =>', err);
    return next(err);
  }
});

router.post('/buildAccountSetTransaction', async function (req: Request, res: Response, next) {
  try {
    const result = await provider.buildAccountSetTransaction(req.body);
    return res.json(result);
  } catch (err) {
    logger.info('BuildAccountSetTransaction =>', err);
    return next(err);
  }
});

router.post('/hashForSignature', async function (req: Request, res: Response, next) {
  try {
    const result = await provider.hashForSignature(req.body);
    return res.json(result);
  } catch (err) {
    logger.info('HashForSignature =>', err);
    return next(err);
  }
});

router.post('/signTransaction', async function (req: Request, res: Response, next) {
  try {
    const result = await provider.signTransaction(req.body);
    return res.json(result);
  } catch (err) {
    logger.info('SignTransaction =>', err);
    return next(err);
  }
});

router.post('/sendTransaction', async function (req: Request, res: Response, next) {
  try {
    const result = await provider.sendTransaction(req.body);
    return res.json(result);
  } catch (err) {
    logger.info('SignTransaction =>', err);
    return next(err);
  }
});

router.post('/buildAccountSetTransaction', async function (req: Request, res: Response, next) {
  try {
    const result = await provider.buildAccountSetTransaction(req.body);
    return res.json(result);
  } catch (err) {
    logger.info('BuildAccountSetTransaction =>', err);
    return next(err);
  }
});

router.post('/buildSignerListSetTransaction', async function (req: Request, res: Response, next) {
  try {
    const result = await provider.buildSignerListSetTransaction(req.body);
    return res.json(result);
  } catch (err) {
    logger.info('BuildSignerListSetTransaction =>', err);
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
    const result = await provider.rebuildTransaction(req.body);
    return res.json(result);
  } catch (err) {
    logger.info('RebuildTransaction =>', err);
    return next(err);
  }
});

module.exports = {
  router: router,
  path: '/ripple',
};
