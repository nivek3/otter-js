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

router.post('/deployMultisigAccount', async function (req: Request, res: Response, next) {
  try {
    const account = polkaDotStateProvider.deployMultisigAccount(req.body);
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
    const data = await polkaDotStateProvider.buildTransferTransaction(req.body);
    return res.json(data);
  } catch (err) {
    logger.info('deployAccount =>', err);
    return next(err);
  }
});

router.post('/buildMultisigTransaction', async function (req: Request, res: Response, next) {
  try {
    const data = await polkaDotStateProvider.buildMultisigTransaction(req.body);
    return res.json(data);
  } catch (err) {
    logger.info('Multisig Transfer =>', err);
    return next(err);
  }
});

router.post('/multisigApproveTransaction', async function (req: Request, res: Response, next) {
  try {
    const data = await polkaDotStateProvider.multisigApproveTransaction(req.body);
    return res.json(data);
  } catch (err) {
    logger.info('Multisig Approve =>', err);
    return next(err);
  }
});

router.post('/multisigCancelTransaction', async function (req: Request, res: Response, next) {
  try {
    const data = await polkaDotStateProvider.multisigCancelTransaction(req.body);
    return res.json(data);
  } catch (err) {
    logger.info('Multisig Cancel =>', err);
    return next(err);
  }
});

router.post('/signTransaction', async function (req: Request, res: Response, next) {
  try {
    const data = await polkaDotStateProvider.signTransaction(req.body);
    return res.json(data);
  } catch (err) {
    logger.info('Sign Tx =>', err);
    return next(err);
  }
});

router.post('/sendTransaction', async function (req: Request, res: Response, next) {
  try {
    const data = await polkaDotStateProvider.sendTransaction(req.body);
    return res.json(data);
  } catch (err) {
    logger.info('Sign Tx =>', err);
    return next(err);
  }
});

module.exports = {
  router: router,
  path: '/polkadot',
};
