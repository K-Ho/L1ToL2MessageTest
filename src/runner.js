'use strict';
const fs = require('fs')

const { gray, green, red } = require('chalk');
const { Watcher } = require('@eth-optimism/watcher')

const {
	Contract,
	ContractFactory,
	providers: { JsonRpcProvider },
	Wallet,
} = require('ethers');

const optimismURL = process.env.L2_URL
const goerliURL = process.env.L1_URL
const l2Provider = new JsonRpcProvider(optimismURL)
const l1Provider = new JsonRpcProvider(goerliURL)

const l1Wallet = new Wallet(process.env.L1_USER_PRIVATE_KEY, l1Provider)
const l2Wallet = new Wallet(process.env.L1_USER_PRIVATE_KEY, l2Provider)

const messengerJSON = JSON.parse(fs.readFileSync('contracts/iOVM_BaseCrossDomainMessenger.json'))
const l2MessengerJSON = JSON.parse(fs.readFileSync('contracts/OVM_L2CrossDomainMessenger.json'))

let SimpleStorage
let L2Messenger

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

let watcher

const initWatcher = () => {
	watcher = new Watcher({
		l1: {
			provider: l1Provider,
			messengerAddress: process.env.L1_MESSENGER_ADDRESS
		},
		l2: {
			provider: l2Provider,
			messengerAddress: process.env.L2_MESSENGER_ADDRESS
		}
	})
}

const deploySimpleStorage = async () => {
	const SimpleStorageJson = JSON.parse(fs.readFileSync('contracts/SimpleStorage.json'))
	const SimpleStorageFactory = new ContractFactory(SimpleStorageJson.abi, SimpleStorageJson.bytecode, l2Wallet)
	SimpleStorage = await SimpleStorageFactory.deploy()
	console.log(green('Deployed SimpleStorage to', SimpleStorage.address))
	await sleep(3000)
}

const deposit = async (amount) => {
	const L1Messenger = new Contract(process.env.L1_MESSENGER_ADDRESS, messengerJSON.abi, l1Wallet)
	L2Messenger = new Contract(process.env.L2_MESSENGER_ADDRESS, l2MessengerJSON.abi, l2Wallet)

	const calldata = SimpleStorage.interface.encodeFunctionData('setValue', [`0x${'42'.repeat(32)}`])
	const l1ToL2Tx = await L1Messenger.sendMessage(
		SimpleStorage.address,
		calldata,
		5000000,
		{gasLimit:7000000}
	)
	await l1ToL2Tx.wait()
	console.log(green('L1->L2 setValue tx complete: https://goerli.etherscan.io/tx/' + l1ToL2Tx.hash))
	const [msgHash] = await watcher.getMessageHashesFromL1Tx(l1ToL2Tx.hash)
	console.log('got L1->L2 message hash!', msgHash)
	const receipt = await watcher.getL2TransactionReceipt(msgHash)
	console.log('completed l1->L2 relay! L2 tx hash:', receipt.transactionHash)
	console.log('simple storage msg.sender', await SimpleStorage.msgSender())
	console.log('simple storage xDomainMessageSender', await SimpleStorage.l1ToL2Sender())
	console.log('simple storage value', await SimpleStorage.value())
	console.log('totalCount', (await SimpleStorage.totalCount()).toString())
}

async function runner() {
	try {
		await deploySimpleStorage()
		initWatcher()
		while(true) {
			await deposit(1)
		}
	} catch (err) {
		console.error(red('Error detected:', err))
	}
}

module.exports = runner
