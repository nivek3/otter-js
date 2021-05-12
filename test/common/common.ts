export function formatTxUnit(rawTx) {
  const feeCoin = rawTx.coins.filter(coin => coin.id === rawTx.feeCoinId)[0];
  const fee = rawTx.fee.shiftedBy(-feeCoin.decimals);
  rawTx.fee = fee.toNumber();
  rawTx.feeString = `${fee.toFixed(feeCoin.decimals).replace(/\.?0+$/, '')} ${feeCoin.symbol}`;
  rawTx.inputs = rawTx.inputs.map(input => {
    const coin = rawTx.coins.filter(coin => coin.id === input.coinId)[0];
    const amount = input.amount.shiftedBy(-coin.decimals);
    input.amount = amount.toNumber();
    input.amountString = `${amount.toFixed(coin.decimals).replace(/\.?0+$/, '')} ${coin.symbol}`;
    return input;
  });
  rawTx.outputs = rawTx.outputs.map(output => {
    const coin = rawTx.coins.filter(coin => coin.id === output.coinId)[0];
    const amount = output.amount.shiftedBy(-coin.decimals);
    output.amount = amount.toNumber();
    output.amountString = `${amount.toFixed(coin.decimals).replace(/\.?0+$/, '')} ${coin.symbol}`;
    return output;
  });
  return {
    txid: rawTx.txid,
    inputs: rawTx.inputs,
    outputs: rawTx.outputs,
    actions: [],
    coins: rawTx.coins,
    fee: rawTx.fee,
    feeCoinId: rawTx.feeCoinId,
    feeString: rawTx.feeString,
    status: rawTx.status,
    blockStatus: rawTx.blockStatus,
    blockHeight: rawTx.blockHeight,
    confirmations: rawTx.confirmations,
    time: rawTx.time,
  };
}

export const renameKeys = (keysMap, obj) =>
Object.keys(obj).reduce(
  (acc, key) => ({
    ...acc,
    ...{ [keysMap[key] || key]: obj[key] }
  }),
  {}
);
