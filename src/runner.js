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
const proxyL2MessengerJSON = JSON.parse(fs.readFileSync('contracts/Proxy_L2Messenger.json'))
const SimpleStorageJson = JSON.parse(fs.readFileSync('contracts/L1SimpleStorage.json'))

let SimpleStorage
let ProxyL2Messenger
let L2Messenger
const L1Messenger = new Contract(process.env.L1_MESSENGER_ADDRESS, messengerJSON.abi, l1Wallet)
L2Messenger = new Contract(process.env.L2_MESSENGER_ADDRESS, l2MessengerJSON.abi, l2Wallet)

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

const deployProxyL2Messenger = async () => {
	const Proxy_L2MessengerFactory = new ContractFactory(proxyL2MessengerJSON.abi, proxyL2MessengerJSON.bytecode, l2Wallet)
	ProxyL2Messenger = await Proxy_L2MessengerFactory.deploy()
	await ProxyL2Messenger.deployTransaction.wait()
	console.log(green('Deployed ProxyL2Messenger to', ProxyL2Messenger.address))
	console.log(green('deployment tx: http://https://l2-explorer.surge.sh/tx/' + ProxyL2Messenger.deployTransaction.hash))
}

const deployL1SimpleStorage = async () => {
	if (process.env.L1_SIMPLE_STORAGE_ADDRESS) {
		SimpleStorage = new Contract(process.env.L1_SIMPLE_STORAGE_ADDRESS, SimpleStorageJson.abi, l1Wallet)
		console.log(green('Using SimpleStorage contract already deployed at', SimpleStorage.address))
		return
	}
	const SimpleStorageFactory = new ContractFactory(SimpleStorageJson.abi, SimpleStorageJson.bytecode, l1Wallet)
	SimpleStorage = await SimpleStorageFactory.deploy()
	await SimpleStorage.deployTransaction.wait()
	console.log(green('Deployed SimpleStorage to', SimpleStorage.address))
	console.log(green('deployment tx: https://goerli.etherscan.io/tx/' + SimpleStorage.deployTransaction.hash))
	await sleep(3000)
}

const withdraw = async () => {
	const calldata = SimpleStorage.interface.encodeFunctionData('setValue', [`0x${'77'.repeat(32)}`])
	const l2ToL1Tx = await ProxyL2Messenger.sendMessage(
		SimpleStorage.address,
		calldata,
		5000000,
		{gasLimit:7000000}
	)
	console.log(green('L2->L1 setValue tx complete: http://https://l2-explorer.surge.sh/tx/' + l2ToL1Tx.hash))
	const receipt = await l2ToL1Tx.wait()
	console.log('receipt for L2Messenger.sendMessage:', receipt)
	const count = (await SimpleStorage.totalCount()).toString()
	while (true) {
		console.log('simple storage msg.sender', await SimpleStorage.msgSender())
		console.log('simple storage xDomainMessageSender', await SimpleStorage.l2ToL1Sender())
		console.log('simple storage value', await SimpleStorage.value())
		console.log('totalCount', (await SimpleStorage.totalCount()).toString())
		console.log('sleeping 1 minute...')
		await sleep(60000)
	}
}

async function runner() {
	try {
		await deployL1SimpleStorage()
		await deployProxyL2Messenger()
		while(true) {
			await withdraw()
		}
	} catch (err) {
		console.error(red('Error detected:', err))
	}
}

module.exports = runner
