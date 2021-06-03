import { Request, Response } from 'express';
const router = require('express').Router({ mergeParams: true });
import { polkaDotStateProvider } from '../../providers/chain-state/polkadot';
import logger from '../../logger';

router.post('/deployAccount', async function (req: Request, res: Response, next) {
  try {
    const account = polkaDotStateProvider.deployAccount(req.body);
    return res.json({
      address: account,
    });
  } catch (err) {
    logger.info('deployAccount =>', err);
    return next(err);
  }
});

module.exports = {
  router: router,
  path: '/polkadot',
};
