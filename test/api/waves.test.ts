import { expect } from 'chai';
import { ChainStateProvider } from '../../src/providers/chain-state';
import { formatTxUnit, renameKeys } from '../common/common';

const chain = "WAVES"
const network = "mainnet"

describe(`${chain}`, function () {
  it('getLatestBlock', async function () {
    let blockId = "latest"
    let block = await ChainStateProvider.getBlock({ chain, network, blockId })
    let formatedBlock: any = renameKeys({ hash: 'blockHash', height: 'blockHeight' }, block)
    expect(formatedBlock).haveOwnProperty("chain")
    expect(formatedBlock).haveOwnProperty("network")
    expect(formatedBlock).haveOwnProperty("blockHeight")
    expect(formatedBlock).haveOwnProperty("blockHash")
    expect(formatedBlock).haveOwnProperty("confirmations")
    expect(formatedBlock.confirmations).to.equal(0)
    expect(formatedBlock).haveOwnProperty("time");
  });

  it('getBlockByHeight', async function () {
    const arr = [
      {
        blockId: "2437994",
        expected: {
          chain,
          network: "mainnet",
          blockHeight: 2437994,
          blockHash: "CKTYnKHh1UEQwLCBNBK54nQHjris3XvPq3dXUw42X7skyDDrVQqSK5d3UvoLdw9Uiufyn1vF2kQU9qKpt8SgxPC",
        }
      },
      {
        blockId: "2437981",
        expected: {
          chain,
          network: "mainnet",
          blockHeight: 2437981,
          blockHash: "2FFEwqka7VMufT7SauKwsnkxXDb4WoUtCZwrHrq8YqeKxJHzJLydjmXm3seXVuDKSR9uDjeUQt7YK6fFBEi3mcrT",
        }
      }
    ]
    for (let i = 0; i < arr.length; i++) {
      let item = arr[i]
      let block = await ChainStateProvider.getBlock({ chain, network, blockId: item.blockId })
      let formatedBlock: any = renameKeys({ hash: 'blockHash', height: 'blockHeight' }, block)
      expect(formatedBlock).haveOwnProperty("chain")
      expect(formatedBlock).haveOwnProperty("network")
      expect(formatedBlock).haveOwnProperty("blockHeight")
      expect(formatedBlock).haveOwnProperty("blockHash")
      expect(formatedBlock).haveOwnProperty("confirmations")
      expect(formatedBlock).haveOwnProperty("time");
      expect(formatedBlock.chain).to.equal(item.expected.chain)
      expect(formatedBlock.network).to.equal(item.expected.network)
      expect(formatedBlock.blockHeight).to.equal(item.expected.blockHeight)
      expect(formatedBlock.blockHash).to.equal(item.expected.blockHash)
    }
  });

  it('test getTxs', async function () {
    const limit = 10000
    const skip = 0
    const arr = [
      {
        blockHeight: 2436766,
        expected: {
          "9u7zhJRUpLsA62iFof1hK1Fo3GEMgEKSnMkWqFxbUB3Z": {
            "txid": "9u7zhJRUpLsA62iFof1hK1Fo3GEMgEKSnMkWqFxbUB3Z",
            "inputs": [
              {
                "address": "3PGS9W5aZ4kdBFJJ9jxmgjLW8qfqu1b3Y66",
                "amount": 0.001,
                "coinId": "WAVES",
                "amountString": "0.001 WAVES"
              }
            ],
            "outputs": [
              {
                "address": "3PQj4MbK3WMdTC9tEtUS8PZbi32vSCExHuy",
                "amount": 0.001,
                "coinId": "WAVES",
                "amountString": "0.001 WAVES"
              }
            ],
            "fee": 0.001,
            "feeCoinId": "WAVES",
            "feeString": "0.001 WAVES",
            "status": "succeed",
            "blockStatus": "confirmed",
            "blockHeight": 2436766,
          },
          "6wc1VX8hthMp7sYuB7Gb2naQxQnHcAmVAmJ3dRoS1ync": {
            "txid": "6wc1VX8hthMp7sYuB7Gb2naQxQnHcAmVAmJ3dRoS1ync",
            "inputs": [
              {
                "address": "3PLrCnhKyX5iFbGDxbqqMvea5VAqxMcinPW",
                "amount": 10,
                "coinId": "WAVES",
                "amountString": "10 WAVES"
              }
            ],
            "outputs": [
              {
                "address": "3PMNRghuFCiMUsQ9aPMteSWQGwiSqLNyZbd",
                "amount": 10,
                "coinId": "WAVES",
                "amountString": "10 WAVES"
              }
            ],
            "fee": 0.001,
            "feeCoinId": "WAVES",
            "feeString": "0.001 WAVES",
            "status": "succeed",
            "blockStatus": "confirmed",
            "blockHeight": 2436766,
          },
          "DrjCGmZw1iBLhdRoDfteRWiXkg8ATTCjFmQDeU5SeZWy": {
            "txid": "DrjCGmZw1iBLhdRoDfteRWiXkg8ATTCjFmQDeU5SeZWy",
            "inputs": [
              {
                "address": "3P2pTpQhGbZrJXATKr75A1uZjeTrb4PHMYf",
                "amount": 6.1334404,
                "coinId": "WAVES",
                "amountString": "6.1334404 WAVES"
              }
            ],
            "outputs": [
              {
                "address": "3PMj3yGPBEa1Sx9X4TSBFeJCMMaE3wvKR4N",
                "amount": 6.1334404,
                "coinId": "WAVES",
                "amountString": "6.1334404 WAVES"
              }
            ],
            "fee": 0.001,
            "feeCoinId": "WAVES",
            "feeString": "0.001 WAVES",
            "status": "succeed",
            "blockStatus": "confirmed",
            "blockHeight": 2436766,
          },
          "2YzGjGTmod78toQmdMoXGPXKbwJvqQWjsxyxq8eZMZY1": {
            "txid": "2YzGjGTmod78toQmdMoXGPXKbwJvqQWjsxyxq8eZMZY1",
            "inputs": [
              {
                "address": "3PLPGmXoDNKeWxSgJRU5vDNogbPj7hJiWQx",
                "amount": 190,
                "coinId": "WAVES",
                "amountString": "190 WAVES"
              }
            ],
            "outputs": [
              {
                "address": "3PDgjqe3kTh3s3U1sbZLCs27xHp2VbhKQiH",
                "amount": 190,
                "coinId": "WAVES",
                "amountString": "190 WAVES"
              }
            ],
            "fee": 0.001,
            "feeCoinId": "WAVES",
            "feeString": "0.001 WAVES",
            "status": "succeed",
            "blockStatus": "confirmed",
            "blockHeight": 2436766,
          }
        }
      }
    ]
    for (let i = 0; i < arr.length; i++) {
      let testItem = arr[i]
      let txs = await ChainStateProvider.getTransactions({ chain, network, limit, skip, blockNumber: testItem.blockHeight });
      let formattedTxs: any = txs;
      formattedTxs.data = formattedTxs.data.map(formatTxUnit)
      formattedTxs.data = formattedTxs.data.map(rawTx => {
        delete rawTx.actions;
        return rawTx;
      })
      formattedTxs = renameKeys({ data: 'list' }, formattedTxs);
      expect(formattedTxs).haveOwnProperty("total")
      expect(formattedTxs).haveOwnProperty("limit")
      expect(formattedTxs).haveOwnProperty("skip")
      expect(formattedTxs).haveOwnProperty("list")
      if (formattedTxs.list && formattedTxs.list.length > 0) {
        for (let item of formattedTxs.list) {
          expect(item).haveOwnProperty("txid")
          expect(item).haveOwnProperty("inputs")
          expect(item).haveOwnProperty("outputs")
          expect(item).haveOwnProperty("fee")
          expect(item).haveOwnProperty("feeCoinId")
          expect(item).haveOwnProperty("status")
          expect(item).haveOwnProperty("blockHeight")
          expect(item).haveOwnProperty("confirmations")
          expect(item).haveOwnProperty("time")
          expect(item.txid).to.equal(testItem.expected[item.txid].txid)
          expect(item.inputs[0].address).to.equal(testItem.expected[item.txid].inputs[0].address)
          expect(item.inputs[0].amount).to.equal(testItem.expected[item.txid].inputs[0].amount)
          expect(item.inputs[0].coinId).to.equal(testItem.expected[item.txid].inputs[0].coinId)
          expect(item.inputs[0].amountString).to.equal(testItem.expected[item.txid].inputs[0].amountString)

          expect(item.outputs[0].address).to.equal(testItem.expected[item.txid].outputs[0].address)
          expect(item.outputs[0].amount).to.equal(testItem.expected[item.txid].outputs[0].amount)
          expect(item.outputs[0].coinId).to.equal(testItem.expected[item.txid].outputs[0].coinId)
          expect(item.outputs[0].amountString).to.equal(testItem.expected[item.txid].outputs[0].amountString)

          expect(item.fee).to.equal(testItem.expected[item.txid].fee)
          expect(item.feeCoinId).to.equal(testItem.expected[item.txid].feeCoinId)
          expect(item.feeString).to.equal(testItem.expected[item.txid].feeString)
          expect(item.status).to.equal(testItem.expected[item.txid].status)
          expect(item.blockHeight).to.equal(testItem.expected[item.txid].blockHeight)
        }
      }
    }

  });

  it('test getTx', async function () {
    const arr = [
      {
        //  transfer success
        txid: "6wc1VX8hthMp7sYuB7Gb2naQxQnHcAmVAmJ3dRoS1ync",
        expected: {
          from: "3PLrCnhKyX5iFbGDxbqqMvea5VAqxMcinPW",
          to: "3PMNRghuFCiMUsQ9aPMteSWQGwiSqLNyZbd",
          amount: 10,
          fee: 0.001,
          status: "succeed",
          blockHeight: 2436766
        }
      },
      // {
      //   //  transfer failure
      //   txid: "5BC155D5E1E84ABCCE8E3C0CD669EE98F9A052A902C8327120FB450A0F0B101D",
      //   expected: {
      //     from: "poc1l70rqyj07zeqhyxtwwvgyugnqc4x25z6042pxk",
      //     to: "poc18hgdl85ul6c8quje64g9z50flc0py5708ec8qa",
      //     amount: "75.94790088",
      //     fee: "0.002",
      //     status: "failed",
      //     blockHeight: 2918682
      //   }
      // },
      {
        //  非原声币 过滤
        txid: "8Rv5k3ybQDTzEbSL39iKzATP5oTVPYrK1vWN2Aw2M4eb",
        expected: {
          from: "",
          to: "",
          amount: 0,
          fee: 0.001,
          status: "succeed",
          blockHeight: 2437994
        }
      },
    ]
    for (let i = 0; i < arr.length; i++) {
      let item = arr[i]
      let tx = await ChainStateProvider.getTransaction({ chain, network, txid: item.txid });
      let formattedTx = formatTxUnit(tx)
      expect(formattedTx).haveOwnProperty("txid")
      expect(formattedTx).haveOwnProperty("inputs")
      expect(formattedTx).haveOwnProperty("outputs")
      expect(formattedTx).haveOwnProperty("fee")
      expect(formattedTx).haveOwnProperty("status")
      expect(formattedTx).haveOwnProperty("blockHeight")
      expect(formattedTx).haveOwnProperty("confirmations")
      expect(formattedTx).haveOwnProperty("time")
      expect(formattedTx.txid).to.equal(item.txid)
      if (item.txid == "788B77CC460BA9C8BC2DF29971DEEF0F137F639B0E9E7BBA5130043B39285180") {
        // poct asset 过滤
        expect(formattedTx.inputs.length).to.equal(0)
        expect(formattedTx.outputs.length).to.equal(0)
      }
      if (formattedTx.inputs.length > 0) {
        expect(formattedTx.inputs[0].address).to.equal(item.expected.from)
        expect(formattedTx.inputs[0].amount).to.equal(item.expected.amount)
        expect(formattedTx.outputs[0].address).to.equal(item.expected.to)
        expect(formattedTx.outputs[0].amount).to.equal(item.expected.amount)
      }

      expect(formattedTx.fee).to.equal(item.expected.fee)
      expect(formattedTx.status).to.equal(item.expected.status)
      expect(formattedTx.blockHeight).to.equal(item.expected.blockHeight)
    }
  });

});