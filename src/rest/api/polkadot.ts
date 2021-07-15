import { Request, Response } from 'express';
const router = require('express').Router({ mergeParams: true });
import { provider } from '../../providers/chain-state/polkadot';
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

router.post('/buildTransferTransaction', async function (req: Request, res: Response, next) {
  try {
    const data = await provider.buildTransferTransaction(req.body);
    return res.json(data);
  } catch (err) {
    logger.info('BuildTransferTransaction =>', err);
    return next(err);
  }
});

router.post('/buildMultisigTransaction', async function (req: Request, res: Response, next) {
  try {
    const data = await provider.buildMultisigTransaction(req.body);
    return res.json(data);
  } catch (err) {
    logger.info('Multisig Transfer =>', err);
    return next(err);
  }
});

router.post('/multisigApproveTransaction', async function (req: Request, res: Response, next) {
  try {
    const data = await provider.multisigApproveTransaction(req.body);
    return res.json(data);
  } catch (err) {
    logger.info('MultisigApproveTransaction =>', err);
    return next(err);
  }
});

router.post('/multisigCancelTransaction', async function (req: Request, res: Response, next) {
  try {
    const data = await provider.multisigCancelTransaction(req.body);
    return res.json(data);
  } catch (err) {
    logger.info('MultisigCancelTransaction =>', err);
    return next(err);
  }
});

router.post('/signTransaction', async function (req: Request, res: Response, next) {
  try {
    const data = await provider.signTransaction(req.body);
    return res.json(data);
  } catch (err) {
    logger.info('signTransaction =>', err);
    return next(err);
  }
});

router.post('/sendTransaction', async function (req: Request, res: Response, next) {
  try {
    const data = await provider.sendTransaction(req.body);
    return res.json(data);
  } catch (err) {
    logger.info('SendTransaction Tx =>', err);
    return next(err);
  }
});

router.post('/batchTransferTransaction', async function (req: Request, res: Response, next) {
  try {
    const data = await provider.batchTransferTransaction(req.body);
    return res.json(data);
  } catch (err) {
    logger.info('BatchTransferTransaction Tx =>', err);
    return next(err);
  }
});

router.post('/batchTransaction', async function (req: Request, res: Response, next) {
  try {
    const data = await provider.batchTransaction(req.body);
    return res.json(data);
  } catch (err) {
    logger.info('BatchTransaction Tx =>', err);
    return next(err);
  }
});

module.exports = {
  router: router,
  path: '/polkadot',
};
