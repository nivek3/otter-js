import { Request, Response, NextFunction } from 'express';
const router = require('express').Router({ mergeParams: true });
import { provider } from '@src/providers/chain-state/bitcoin/bitcoin';
import logger from '@src/logger';

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

router.post('/deploySegwitAccount', async function (req: Request, res: Response, next) {
  try {
    const account = provider.deploySegwitAccount(req.body);
    return res.json({
      address: account,
    });
  } catch (err) {
    logger.info('DeploySegwitAccount =>', err);
    return next(err);
  }
});

router.post('/deployMultisigLegacyAccount', async function (req: Request, res: Response, next: NextFunction) {
  try {
    const account = provider.deployMultisigLegacyAccount(req.body);
    return res.json({
      address: account,
    });
  } catch (err) {
    logger.info('DeployMultisigLegacyAccount =>', err);
    return next(err);
  }
});

router.post('/deployMultisigSegwitAccount', async function (req: Request, res: Response, next: NextFunction) {
  try {
    const account = provider.deployMultisigSegwitAccount(req.body);
    return res.json({
      address: account,
    });
  } catch (err) {
    logger.info('DeployMultisigSegwitAccount =>', err);
    return next(err);
  }
});

router.post('/buildTransaction', async function (req: Request, res: Response, next: NextFunction) {
  try {
    const data = await provider.buildTransaction(req.body);
    return res.json(data);
  } catch (err) {
    logger.info('BuildTransaction =>', err);
    return next(err);
  }
});

router.post('/hashForSignature', async function (req: Request, res: Response, next: NextFunction) {
  try {
    const data = provider.hashForSignature(req.body);
    return res.json(data);
  } catch (err) {
    logger.info('HashForSignature =>', err);
    return next(err);
  }
});

router.post('/signTransaction', async function (req: Request, res: Response, next: NextFunction) {
  try {
    const data = provider.signTransaction(req.body);
    return res.json(data);
  } catch (err) {
    logger.info('SignTransaction =>', err);
    return next(err);
  }
});

router.post('/sendTransaction', async function (req: Request, res: Response, next: NextFunction) {
  try {
    const data = await provider.sendTransaction(req.body);
    return res.json(data);
  } catch (err) {
    logger.info('SendTransaction =>', err);
    return next(err);
  }
});

module.exports = {
  router: router,
  path: '/bitcoin',
};
