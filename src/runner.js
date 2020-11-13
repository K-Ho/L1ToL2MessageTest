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
console.log(l1Wallet.address)
const l2Wallet = new Wallet(process.env.L1_USER_PRIVATE_KEY, l2Provider)

const messengerJSON = JSON.parse(fs.readFileSync('contracts/iOVM_BaseCrossDomainMessenger.json'))
const l2MessengerJSON = JSON.parse(fs.readFileSync('contracts/OVM_L2CrossDomainMessenger.json'))
const l2ToL1PasserJSON = JSON.parse(fs.readFileSync('contracts/OVM_L2ToL1MessagePasser.json'))
const addressManagerJSON = JSON.parse(fs.readFileSync('contracts/Lib_AddressManager.json'))
const l2ETHJson = JSON.parse(fs.readFileSync('contracts/ERC20.json'))

let SimpleStorage
let L2Messenger
let AddressManager
let L1ToL2Passer
let L2ETH

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

const deployAllL2Contracts = async () => {
	const L2MessengerFactory = new ContractFactory(l2MessengerJSON.abi, l2MessengerJSON.bytecode, l2Wallet)
	L2Messenger = await L2MessengerFactory.deploy('0x4200000000000000000000000000000000000008')
	console.log(green('Deployed L2Messenger to', L2Messenger.address))

	const AddressManagerFactory = new ContractFactory(addressManagerJSON.abi, addressManagerJSON.bytecode, l2Wallet)
	AddressManager = await AddressManagerFactory.deploy()
	console.log(green('Deployed AddressManager to', AddressManager.address))

	const L1ToL2PasserFactory = new ContractFactory(l2ToL1PasserJSON.abi, l2ToL1PasserJSON.bytecode, l2Wallet)
	L1ToL2Passer = await L1ToL2PasserFactory.deploy()
	console.log(green('Deployed L1ToL2Passer to', L1ToL2Passer.address))

	const L2ETHFactory = new ContractFactory(l2ETHJson.abi, l2ETHJson.bytecode, l2Wallet)
	L2ETH = await L2ETHFactory.deploy()
	console.log(green('Deployed L2ETH to', L2ETH.address))
}

const setAddress = async () => {
	const AddressManager = new Contract(process.env.ADDRESS_MANAGER_ADDRESS, addressManagerJSON.abi, l2Wallet)
	const setAddress = await AddressManager.setAddress('OVM_L1CrossDomainMessenger', process.env.L1_MESSENGER_ADDRESS)
	console.log('set address', await setAddress.wait())
	await sleep(3000)
}

const deposit = async (amount) => {
	const L1Messenger = new Contract(process.env.L1_MESSENGER_ADDRESS, messengerJSON.abi, l1Wallet)
	L2Messenger = new Contract(process.env.L2_MESSENGER_ADDRESS, l2MessengerJSON.abi, l2Wallet)

	const calldata = SimpleStorage.interface.encodeFunctionData('setValue', [`0x${'42'.repeat(32)}`])
	const l1ToL2Tx = await L1Messenger.sendMessage(
		SimpleStorage.address,
		calldata,
		6000000,
		{gasLimit:9000000}
	)
	await l1Provider.waitForTransaction(l1ToL2Tx.hash)
	console.log(green('L1->L2 setValue tx complete: https://goerli.etherscan.io/tx/' + l1ToL2Tx.hash))
	let senderNum = 0
	while (senderNum == 0) {
		const msgSender = await L2Messenger.xDomainMessageSender()
		console.log('Got xdomainMessageSender', msgSender)
		senderNum = parseInt(msgSender, 16)
		await sleep(5000)
	}
	console.log('simple storage msg.sender', await SimpleStorage.msgSender())
	console.log('simple storage xDomainMessageSender', await SimpleStorage.l1ToL2Sender())
	console.log('simple storage value', await SimpleStorage.value())
	console.log('totalCount', await SimpleStorage.totalCount())
}

async function runner() {
	try {
		// await deployAllL2Contracts()
		// await setAddress()
		await deploySimpleStorage()
		initWatcher()
		await deposit(1)
	} catch (err) {
		console.error(red('Error detected:', err))
	}
}

module.exports = runner
