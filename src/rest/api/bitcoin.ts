import { Request, Response } from 'express';
const router = require('express').Router({ mergeParams: true });
import { bitcoinStateProvider as provider } from '../../providers/chain-state/bitcoin/bitcoin';
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

router.post('/deployMultisigAccount', async function (req: Request, res: Response, next) {
  try {
    const account = provider.deployMultisigAccount(req.body);
    return res.json({
      address: account,
    });
  } catch (err) {
    logger.info('deployMultisigAccount =>', err);
    return next(err);
  }
});

router.post('/tx', async function (req: Request, res: Response, next) {
  try {
    const data = await provider.buildTransaction(req.body);
    return res.json(data);
  } catch (err) {
    logger.info('BuildTransaction =>', err);
    return next(err);
  }
});

router.post('/sign', async function (req: Request, res: Response, next) {
  try {
    const data = await provider.signTransaction(req.body);
    return res.json(data);
  } catch (err) {
    logger.info('SignTransaction =>', err);
    return next(err);
  }
});

module.exports = {
  router: router,
  path: '/bitcoin',
};
