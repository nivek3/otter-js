import { Request, Response } from 'express';
const router = require('express').Router({ mergeParams: true });
import { ChainStateProvider } from '../../providers/chain-state';
import logger from '../../logger';

router.post('/', async function (req: Request, res: Response, next) {
  try {
    const account = await ChainStateProvider.deployAccount(req.body);
    return res.json({
      address: account,
    });
  } catch (err) {
    logger.info(`deployAccount => ${JSON.stringify(err)}`);
    return next(err);
  }
});

module.exports = {
  router: router,
  path: '/deployAccount',
};
