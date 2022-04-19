import { ApiPromise } from '@polkadot/api';
import { BN, BN_ZERO, isFunction } from '@polkadot/util';
import type { DeriveStakerReward } from '@polkadot/api-derive/types';
import type { EraIndex, Weight, Balance } from '@polkadot/types/interfaces';

interface EraSelection {
  value: number;
  text: string;
}

interface PayoutValidator {
  available: BN;
  eras: PayoutEraValidator[];
  validatorId: string;
}
interface PayoutEraValidator {
  era: EraIndex;
  stashes: Record<string, Balance>;
}

interface SinglePayout {
  era: EraIndex;
  validatorId: string;
}

export async function getPayOutStakes(api: ApiPromise, address: string) {
  const allEras = await api.derive.staking?.erasHistoric();
  const eraSelection = await getMaxEras(api);
  const filteredEras = allEras.slice(-1 * eraSelection[0].value);
  const stakerRewards = await api.derive.staking.stakerRewardsMultiEras([address], filteredEras);
  const { allRewards } = _getRewards([address], stakerRewards);

  const stakerPayoutsAfter = isFunction(api.tx.staking.payoutStakers) ? new BN(0) : new BN('1000000000');
  const { validators } = _getAvailable(allRewards, stakerPayoutsAfter);
  const maxPayoutsNum = await getMaxPayouts(api, address, validators!);
  const payoutStakes = createExtrinsics(api, validators!, maxPayoutsNum);

  return { maxPayouts: maxPayoutsNum, payoutStakes: payoutStakes?.flat() };
}

async function getMaxEras(api: ApiPromise) {
  const DAY_SECS = new BN(1000 * 60 * 60 * 24);
  const eraLength = await api.derive.session.eraLength();
  const historyDepth = await api.query.staking.historyDepth();

  if (eraLength && historyDepth) {
    const blocksPerDay = DAY_SECS.div(api.consts.babe?.expectedBlockTime || api.consts.timestamp?.minimumPeriod.muln(2) || new BN(6000));
    const maxBlocks = eraLength.mul(historyDepth);
    const eraSelection: EraSelection[] = [];
    let days = 2;

    while (true) {
      const dayBlocks = blocksPerDay.muln(days);
      if (dayBlocks.gte(maxBlocks)) {
        break;
      }

      eraSelection.push({
        text: '',
        value: dayBlocks.div(eraLength).toNumber(),
      });

      days = days * 3;
    }

    eraSelection.push({
      text: '',
      value: historyDepth.toNumber(),
    });
    return eraSelection;
  }
  return [{ text: '', value: 0 }];
}

async function getMaxPayouts(api: ApiPromise, accountAddress: string, payout: PayoutValidator | PayoutValidator[]): Promise<number> {
  let maxNum: number | undefined;
  if (payout && (!Array.isArray(payout) || payout.length !== 0)) {
    const { eras, validatorId } = Array.isArray(payout) ? payout[0] : payout;

    await api.tx.staking
      .payoutStakers(validatorId, eras[0].era)
      .paymentInfo(accountAddress)
      .then((info) => {
        maxNum = Math.floor(
          (api.consts.system.blockWeights
            ? api.consts.system.blockWeights.maxBlock
            : (api.consts.system.maximumBlockWeight as unknown as Weight)
          )
            .muln(64) // 65% of the block weight on a single extrinsic (64 for safety)
            .div(info.weight)
            .toNumber() / 100,
        );
      })
      .catch(console.error);

    return maxNum!;
  } else {
    return Math.floor((36 * 64) / (api.consts.staking.maxNominatorRewardedPerValidator?.toNumber() || 64));
  }
}

function createExtrinsics(api: ApiPromise, payout: PayoutValidator | PayoutValidator[], maxPayouts: number): SinglePayout[][] {
  if (Array.isArray(payout)) {
    if (payout.length === 1) {
      return createExtrinsics(api, payout[0], maxPayouts);
    }

    return createBatches(
      api,
      maxPayouts,
      payout.reduce((payouts: SinglePayout[], { eras, validatorId }): SinglePayout[] => {
        eras.forEach(({ era }): void => {
          payouts.push({ era, validatorId });
        });

        return payouts;
      }, []),
    );
  }

  const { eras, validatorId } = payout;

  return eras.length === 1
    ? [[{ era: eras[0].era, validatorId }]]
    : createBatches(
        api,
        maxPayouts,
        eras.map((era): SinglePayout => ({ era: era.era, validatorId })),
      );
}

function createBatches(_api: ApiPromise, maxPayouts: number, payouts: SinglePayout[]): SinglePayout[][] {
  return payouts
    .sort((a, b) => a.era.cmp(b.era))
    .reduce(
      (batches: SinglePayout[][], { era, validatorId }): SinglePayout[][] => {
        const item = { era, validatorId };
        const batch = batches[batches.length - 1];

        if (batch.length >= maxPayouts) {
          batches.push([item]);
        } else {
          batch.push(item);
        }

        return batches;
      },
      [[]],
    );
}

function _getRewards(stashIds: string[], available: any) {
  const allRewards = {};

  stashIds.forEach((stashId, index) => {
    allRewards[stashId] = available[index].filter(({ eraReward }) => !eraReward.isZero());
  });

  return {
    allRewards,
    rewardCount: Object.values(allRewards).filter((rewards: any) => rewards.length !== 0).length,
  };
}

function _extractStashes(allRewards: Record<string, DeriveStakerReward[]>) {
  return Object.entries(allRewards)
    .map(([stashId, rewards]) => ({
      available: rewards.reduce(
        (result, { validators }) => Object.values(validators).reduce((result, { value }) => result.iadd(value), result),
        new BN(0),
      ),
      rewards,
      stashId,
    }))
    .filter(({ available }) => !available.isZero())
    .sort((a, b) => b.available.cmp(a.available));
}

function _getAvailable(allRewards: Record<string, DeriveStakerReward[]>, stakerPayoutsAfter: BN) {
  if (allRewards) {
    const stashes = _extractStashes(allRewards);
    const stashTotal = stashes.length ? stashes.reduce((total, { available }) => total.add(available), BN_ZERO) : null;

    return {
      stashTotal,
      stashes,
      validators: _groupByValidator(allRewards, stakerPayoutsAfter),
    };
  }

  return {};
}

function _groupByValidator(allRewards: Record<string, DeriveStakerReward[]>, stakerPayoutsAfter: BN) {
  return Object.entries(allRewards)
    .reduce((grouped: PayoutValidator[], [stashId, rewards]) => {
      rewards
        .filter(({ era }) => era.gte(stakerPayoutsAfter))
        .forEach((reward) => {
          Object.entries(reward.validators).forEach(([validatorId, { value }]) => {
            const entry = grouped.find((entry) => entry.validatorId === validatorId);

            if (entry) {
              const eraEntry = entry.eras.find((entry) => entry.era.eq(reward.era));

              if (eraEntry) {
                eraEntry.stashes[stashId] = value;
              } else {
                entry.eras.push({
                  era: reward.era,
                  stashes: { [stashId]: value },
                });
              }

              entry.available = entry.available.add(value);
            } else {
              grouped.push({
                available: value,
                eras: [
                  {
                    era: reward.era,
                    stashes: { [stashId]: value },
                  },
                ],
                validatorId,
              });
            }
          });
        });

      return grouped;
    }, [])
    .sort((a, b) => b.available.cmp(a.available));
}
