import { Request, Response } from 'express';
const router = require('express').Router({ mergeParams: true });
import { provider } from '../../providers/chain-state/cosmos';
import logger from '../../logger';

router.post('/deployAccount', async function (req: Request, res: Response, next) {
  try {
    const result = provider.deployAccount(req.body);
    return res.json(result);
  } catch (err) {
    logger.info('DeployAccount =>', err);
    return next(err);
  }
});

router.post('/buildTransferTransaction', async function (req: Request, res: Response, next) {
  try {
    const result = await provider.buildTransferTransaction(req.body);
    return res.json(result);
  } catch (err) {
    logger.info('BuildTransferTransaction =>', err);
    return next(err);
  }
});

router.post('/signTransaction', async function (req: Request, res: Response, next) {
  try {
    const result = await provider.signTransaction(req.body);
    return res.json(result);
  } catch (err) {
    logger.info('SignTransaction =>', err);
    return next(err);
  }
});

router.post('/deployMultisigAccount', async function (req: Request, res: Response, next) {
  try {
    const result = provider.deployMultisigAccount(req.body);
    return res.json(result);
  } catch (err) {
    logger.info('DeployMultisigAccount =>', err);
    return next(err);
  }
});

router.post('/buildMultisigTransferTransaction', async function (req: Request, res: Response, next) {
  try {
    const result = await provider.buildMultisigTransferTransaction(req.body);
    return res.json(result);
  } catch (err) {
    logger.info('BuildMultisigTransferTransaction =>', err);
    return next(err);
  }
});

router.post('/signMultisigTransaction', async function (req: Request, res: Response, next) {
  try {
    const result = await provider.signMultisigTransaction(req.body);
    return res.json(result);
  } catch (err) {
    logger.info('SignMultisigTransaction =>', err);
    return next(err);
  }
});

router.post('/sendTransaction', async function (req: Request, res: Response, next) {
  try {
    const result = await provider.sendTransaction(req.body);
    return res.json(result);
  } catch (err) {
    logger.info('SendTransaction =>', err);
    return next(err);
  }
});

router.post('/decodeTransaction', async function (req: Request, res: Response, next) {
  try {
    const result = await provider.decodeTransaction(req.body);
    return res.json(result);
  } catch (err) {
    logger.info('DecodeTransaction =>', err);
    return next(err);
  }
});

router.post('/rebuildTransaction', async function (req: Request, res: Response, next) {
  try {
    const result = await provider.rebuildTransaction(req.body);
    return res.json(result);
  } catch (err) {
    logger.info('RebuildTransaction =>', err);
    return next(err);
  }
});

router.post('/buildDelegateTransaction', async function (req: Request, res: Response, next) {
  try {
    const result = await provider.buildDelegateTransaction(req.body);
    return res.json(result);
  } catch (err) {
    logger.info('DelegateTransaction =>', err);
    return next(err);
  }
});

router.post('/buildUndelegateTransaction', async function (req: Request, res: Response, next) {
  try {
    const result = await provider.buildUndelegateTransaction(req.body);
    return res.json(result);
  } catch (err) {
    logger.info('BuildUndelegateTransaction =>', err);
    return next(err);
  }
});

router.post('/buildRedelegateTransaction', async function (req: Request, res: Response, next) {
  try {
    const result = await provider.buildRedelegateTransaction(req.body);
    return res.json(result);
  } catch (err) {
    logger.info('BuildRedelegateTransaction =>', err);
    return next(err);
  }
});

router.post('/buildWithdrawDelegationRewardTransaction', async function (req: Request, res: Response, next) {
  try {
    const result = await provider.buildWithdrawDelegationRewardTransaction(req.body);
    return res.json(result);
  } catch (err) {
    logger.info('BuildWithdrawDelegationRewardsTransaction =>', err);
    return next(err);
  }
});

router.post('/buildMultisigDelegateTransaction', async function (req: Request, res: Response, next) {
  try {
    const result = await provider.buildMultisigDelegateTransaction(req.body);
    return res.json(result);
  } catch (err) {
    logger.info('BuildMultisigDelegateTransaction =>', err);
    return next(err);
  }
});

router.post('/buildMultisigUndelegateTransaction', async function (req: Request, res: Response, next) {
  try {
    const result = await provider.buildMultisigUndelegateTransaction(req.body);
    return res.json(result);
  } catch (err) {
    logger.info('BuildMultisigUndelegateTransaction =>', err);
    return next(err);
  }
});

router.post('/buildMultisigRedelegateTransaction', async function (req: Request, res: Response, next) {
  try {
    const result = await provider.buildMultisigRedelegateTransaction(req.body);
    return res.json(result);
  } catch (err) {
    logger.info('BuildMultisigRedelegateTransaction =>', err);
    return next(err);
  }
});

router.post('/buildMultisigWithdrawDelegationRewardTransaction', async function (req: Request, res: Response, next) {
  try {
    const result = await provider.buildMultisigWithdrawDelegationRewardTransaction(req.body);
    return res.json(result);
  } catch (err) {
    logger.info('BuildMultisigWithdrawDelegationRewardTransaction =>', err);
    return next(err);
  }
});

module.exports = {
  router: router,
  path: '/cosmos',
};
