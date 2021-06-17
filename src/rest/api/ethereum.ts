import { Request, Response } from 'express';
const router = require('express').Router({ mergeParams: true });
import { provider } from '../../providers/chain-state/ethereum/ethereum';
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

router.post('/buildAccount', async function (req: Request, res: Response, next) {
  try {
    const account = await provider.buildAccountTransaction(req.body);
    return res.json({
      address: account,
    });
  } catch (err) {
    logger.info('buildAccount =>', err);
    return next(err);
  }
});

router.post('/signTransaction', async function (req: Request, res: Response, next) {
  try {
    const tx = provider.signTransaction(req.body);
    return res.json(tx);
  } catch (err) {
    logger.info('signTransaction =>', err);
    return next(err);
  }
});

module.exports = {
  router: router,
  path: '/ethereum',
};
