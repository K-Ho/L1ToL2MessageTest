'use strict';
const fs = require('fs')

const { gray, green, red } = require('chalk');
const { Watcher } = require('@eth-optimism/watcher')
const { getContractInterface } = require('@eth-optimism/contracts')

const {
	Contract,
	providers: { JsonRpcProvider },
	Wallet,
	utils,
	ContractFactory
} = require('ethers');


const optimismURL = process.env.L2_URL
const l1URL = process.env.L1_URL
const l1Provider = new JsonRpcProvider(l1URL)
const l2Provider = new JsonRpcProvider(optimismURL)

const checkETHBalances = async (l2BlockNum) => {
	const l2BlockTransactions = await l2Provider.send('eth_getBlockByNumber', [`0x${l2BlockNum.toString(16)}`, true])
	const l1BlockNum = l2BlockTransactions.transactions[0].l1BlockNumber
	const OVM_ETH = new Contract(process.env.L2_ETH_ADDRESS, getContractInterface('iL2StandardERC20'), l2Provider)
	const l1ETHBalance = await l1Provider.getBalance(process.env.L1_BRIDGE_ADDRESS, l1BlockNum)
	const l2ETHBalance = await OVM_ETH.totalSupply({blockTag: l2BlockNum})
	console.log(`L1 ETH balance at block ${l1BlockNum}: ${utils.formatEther(l1ETHBalance)}`)
	console.log(`L2 ETH balance at block ${l2BlockNum}: ${utils.formatEther(l2ETHBalance)}`)
}

async function runner() {
	try {
		for (let l2BlockNum = 1; l2BlockNum < 20000; l2BlockNum++) {
			await checkETHBalances(l2BlockNum)
		}
	} catch (err) {
		console.error(red('Error detected:', err))
	}
}

module.exports = runner
