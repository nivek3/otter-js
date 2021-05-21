import { Request, Response } from 'express';
const router = require('express').Router({ mergeParams: true });
import { ChainStateProvider } from '../../providers/chain-state';
import logger from '../../logger';

router.post('/', async function (req: Request, res: Response, next) {
  try {
    const data = await ChainStateProvider.buildTransaction(req.body);
    return res.json(data);
  } catch (err) {
    logger.error('buildTransaction =>', err);
    return next(err);
  }
});

module.exports = {
  router: router,
  path: '/buildTransaction',
};
