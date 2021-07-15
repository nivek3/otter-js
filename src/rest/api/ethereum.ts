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

router.post('/buildAccountTransaction', async function (req: Request, res: Response, next) {
  try {
    const data = await provider.buildAccountTransaction(req.body);
    return res.json(data);
  } catch (err) {
    logger.info('buildAccountTransaction =>', err);
    return next(err);
  }
});

router.post('/buildTransferTransaction', async function (req: Request, res: Response, next) {
  try {
    const data = await provider.buildTransferTransaction(req.body);
    return res.json(data);
  } catch (err) {
    logger.info('buildTransferTransaction =>', err);
    return next(err);
  }
});

router.post('/buildTokenTransferTransaction', async function (req: Request, res: Response, next) {
  try {
    const data = await provider.buildTokenTransferTransaction(req.body);
    return res.json(data);
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

router.post('/sendTransaction', async function (req: Request, res: Response, next) {
  try {
    const tx = await provider.sendTransaction(req.body);
    return res.json(tx);
  } catch (err) {
    logger.info('sendTransaction =>', err);
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

router.post('/buildMultisigTransferInput', async function (req: Request, res: Response, next) {
  try {
    const result = provider.buildMultisigTransferInput(req.body);
    return res.json(result);
  } catch (err) {
    logger.info('buildMultisigTransferInput =>', err);
    return next(err);
  }
});

router.post('/signMultisigTransferInput', async function (req: Request, res: Response, next) {
  try {
    const result = provider.signMultisigTransferInput(req.body);
    return res.json(result);
  } catch (err) {
    logger.info('signMultisigTransferInput =>', err);
    return next(err);
  }
});

router.post('/buildMultisigTransferTransaction', async function (req: Request, res: Response, next) {
  try {
    const result = await provider.buildMultisigTransferTransaction(req.body);
    return res.json(result);
  } catch (err) {
    logger.info('buildMultisigTransferTransaction =>', err);
    return next(err);
  }
});

router.post('/buildMultisigTokenTransferInput', async function (req: Request, res: Response, next) {
  try {
    const result = provider.buildMultisigTokenTransferInput(req.body);
    return res.json(result);
  } catch (err) {
    logger.info('buildMultisigTokenTransferInput =>', err);
    return next(err);
  }
});

router.post('/signMultisigTokenTransferInput', async function (req: Request, res: Response, next) {
  try {
    const result = provider.signMultisigTokenTransferInput(req.body);
    return res.json(result);
  } catch (err) {
    logger.info('signMultisigTokenTransferInput =>', err);
    return next(err);
  }
});

router.post('/hashForSignature', async function (req: Request, res: Response, next) {
  try {
    const result = provider.hashForSignature(req.body);
    return res.json(result);
  } catch (err) {
    logger.info('hashForSignature =>', err);
    return next(err);
  }
});

module.exports = {
  router: router,
  path: '/ethereum',
};
