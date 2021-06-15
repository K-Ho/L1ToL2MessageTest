'use strict';
const fs = require('fs')

const { gray, green, red } = require('chalk');
const { Watcher } = require('@eth-optimism/watcher')

const {
	Contract,
	providers: { JsonRpcProvider },
	Wallet,
	utils
} = require('ethers');

const optimismURL = process.env.L2_URL
const l1URL = process.env.L1_URL
const l2Provider = new JsonRpcProvider(optimismURL)
const l1Provider = new JsonRpcProvider(l1URL)

const l2Wallet = new Wallet(process.env.L2_USER_PRIVATE_KEY, l2Provider)

const l2BridgeJSON = JSON.parse(fs.readFileSync('contracts/OVM_L2StandardBridge.json'))

let L2Bridge
L2Bridge = new Contract(process.env.L2_BRIDGE_ADDRESS, l2BridgeJSON.abi, l2Wallet)

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const withdraw = async () => {
	const l1Bridge = await L2Bridge.l1TokenBridge()
	console.log('l1 bridge address', l1Bridge)
	const withdrawnAmount = utils.parseEther('0.0005')
	const l2ToL1Tx = await L2Bridge.withdraw(
		'0x4200000000000000000000000000000000000006',
		withdrawnAmount,
		330_000,
		'0xFFFF',
		{gasPrice: 0}
	)
	console.log(green('L2->L1 ETH withdrawal tx complete: http://https://l2-explorer.surge.sh/tx/' + l2ToL1Tx.hash))
	const receipt = await l2ToL1Tx.wait()
	console.log('receipt for ETH withdrawal:', receipt)
	while (true) {
		console.log('L1 wallet Balance:', (await l1Provider.getBalance(l2Wallet.address)).toString())
		console.log('sleeping 1 minute...')
		await sleep(60000)
	}
}

async function runner() {
	try {
		await withdraw()
	} catch (err) {
		console.error(red('Error detected:', err))
	}
}

module.exports = runner
