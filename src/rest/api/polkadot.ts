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

router.post('/buildMultisigApproveTransaction', async function (req: Request, res: Response, next) {
  try {
    const data = await provider.buildMultisigApproveTransaction(req.body);
    return res.json(data);
  } catch (err) {
    logger.info('BuildMultisigApproveTransaction =>', err);
    return next(err);
  }
});

router.post('/buildMultisigCancelTransaction', async function (req: Request, res: Response, next) {
  try {
    const data = await provider.buildMultisigCancelTransaction(req.body);
    return res.json(data);
  } catch (err) {
    logger.info('BuildMultisigCancelTransaction =>', err);
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

router.post('/buildBatchTransferTransaction', async function (req: Request, res: Response, next) {
  try {
    const data = await provider.buildBatchTransferTransaction(req.body);
    return res.json(data);
  } catch (err) {
    logger.info('BuildBatchTransferTransaction Tx =>', err);
    return next(err);
  }
});

router.post('/buildBatchTransaction', async function (req: Request, res: Response, next) {
  try {
    const data = await provider.buildBatchTransaction(req.body);
    return res.json(data);
  } catch (err) {
    logger.info('BuildBatchTransaction Tx =>', err);
    return next(err);
  }
});

router.post('/rebuildTransaction', async function (req: Request, res: Response, next) {
  try {
    const data = await provider.rebuildTransaction(req.body);
    return res.json(data);
  } catch (err) {
    logger.info('RebuildTransaction Tx =>', err);
    return next(err);
  }
});

router.post('/decodeTransaction', async function (req: Request, res: Response, next) {
  try {
    const data = await provider.decodeTransaction(req.body);
    return res.json(data);
  } catch (err) {
    logger.info('DecodeTransaction Tx =>', err);
    return next(err);
  }
});

module.exports = {
  router: router,
  path: '/polkadot',
};
