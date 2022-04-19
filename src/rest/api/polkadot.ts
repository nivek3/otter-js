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
    logger.error('deployAccount =>', err);
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
    logger.error('deployMultisigAccount =>', err);
    return next(err);
  }
});

router.post('/buildTransferTransaction', async function (req: Request, res: Response, next) {
  try {
    const data = await provider.buildTransferTransaction(req.body);
    return res.json(data);
  } catch (err) {
    logger.error('BuildTransferTransaction =>', err);
    return next(err);
  }
});

router.post('/buildMultisigApproveAsMultiTransaction', async function (req: Request, res: Response, next) {
  try {
    const data = await provider.buildMultisigApproveAsMultiTransaction(req.body);
    return res.json(data);
  } catch (err) {
    logger.error('BuildMultisigApproveAsMultiTransaction =>', err);
    return next(err);
  }
});

router.post('/buildMultisigAsMultiTransaction', async function (req: Request, res: Response, next) {
  try {
    const data = await provider.buildMultisigAsMultiTransaction(req.body);
    return res.json(data);
  } catch (err) {
    logger.error('BuildMultisigAsMultiTransaction =>', err);
    return next(err);
  }
});

router.post('/buildMultisigCancelAsMultiTransaction', async function (req: Request, res: Response, next) {
  try {
    const data = await provider.buildMultisigCancelAsMultiTransaction(req.body);
    return res.json(data);
  } catch (err) {
    logger.error('BuildMultisigCancelAsMultiTransaction =>', err);
    return next(err);
  }
});

router.post('/signTransaction', async function (req: Request, res: Response, next) {
  try {
    const data = await provider.signTransaction(req.body);
    return res.json(data);
  } catch (err) {
    logger.error('signTransaction =>', err);
    return next(err);
  }
});

router.post('/sendTransaction', async function (req: Request, res: Response, next) {
  try {
    const data = await provider.sendTransaction(req.body);
    return res.json(data);
  } catch (err) {
    logger.error('SendTransaction Tx =>', err);
    return next(err);
  }
});

router.post('/buildBatchTransferTransaction', async function (req: Request, res: Response, next) {
  try {
    const data = await provider.buildBatchTransferTransaction(req.body);
    return res.json(data);
  } catch (err) {
    logger.error('BuildBatchTransferTransaction Tx =>', err);
    return next(err);
  }
});

router.post('/buildBatchTransaction', async function (req: Request, res: Response, next) {
  try {
    const data = await provider.buildBatchTransaction(req.body);
    return res.json(data);
  } catch (err) {
    logger.error('BuildBatchTransaction Tx =>', err);
    return next(err);
  }
});

router.post('/rebuildTransaction', async function (req: Request, res: Response, next) {
  try {
    const data = await provider.rebuildTransaction(req.body);
    return res.json(data);
  } catch (err) {
    logger.error('RebuildTransaction Tx =>', err);
    return next(err);
  }
});

router.post('/decodeTransaction', async function (req: Request, res: Response, next) {
  try {
    const data = await provider.decodeTransaction(req.body);
    return res.json(data);
  } catch (err) {
    logger.error('DecodeTransaction Tx =>', err);
    return next(err);
  }
});

router.post('/buildStakingBondAndNominateTransaction', async function (req: Request, res: Response, next) {
  try {
    const data = await provider.buildStakingBondAndNominateTransaction(req.body);
    return res.json(data);
  } catch (err) {
    logger.error('BuildStakingBondAndNominateTransaction Tx =>', err);
    return next(err);
  }
});

router.post('/buildStakingNominateTransaction', async function (req: Request, res: Response, next) {
  try {
    const data = await provider.buildStakingNominateTransaction(req.body);
    return res.json(data);
  } catch (err) {
    logger.error('BuildStakingNominateTransaction Tx =>', err);
    return next(err);
  }
});

router.post('/buildStakingBondExtraTransaction', async function (req: Request, res: Response, next) {
  try {
    const data = await provider.buildStakingBondExtraTransaction(req.body);
    return res.json(data);
  } catch (err) {
    logger.error('BuildStakingBondExtraTransaction Tx =>', err);
    return next(err);
  }
});

router.post('/buildStakingUnbondTransaction', async function (req: Request, res: Response, next) {
  try {
    const data = await provider.buildStakingUnbondTransaction(req.body);
    return res.json(data);
  } catch (err) {
    logger.error('BuildStakingBondExtraTransaction Tx =>', err);
    return next(err);
  }
});

router.post('/buildStakingWithdrawUnbondedTransaction', async function (req: Request, res: Response, next) {
  try {
    const data = await provider.buildStakingWithdrawUnbondedTransaction(req.body);
    return res.json(data);
  } catch (err) {
    logger.error('BuildStakingWithdrawUnbondedTransaction Tx =>', err);
    return next(err);
  }
});

router.post('/buildStakingPayoutStakersTransaction', async function (req: Request, res: Response, next) {
  try {
    const data = await provider.buildStakingPayoutStakersTransaction(req.body);
    return res.json(data);
  } catch (err) {
    logger.error('BuildStakingPayoutStakersTransaction Tx =>', err);
    return next(err);
  }
});

router.post('/queryStakingPayoutStakers', async function (req: Request, res: Response, next) {
  try {
    const data = await provider.queryStakingPayoutStakers(req.body);
    return res.json(data);
  } catch (err) {
    logger.error('QueryStakingPayoutStakers =>', err);
    return next(err);
  }
});

module.exports = {
  router: router,
  path: '/polkadot',
};
