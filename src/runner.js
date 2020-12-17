'use strict';
const fs = require('fs')

const { gray, green, red } = require('chalk');

const {
	Contract,
	ContractFactory,
	providers: { JsonRpcProvider },
	Wallet,
} = require('ethers');

const optimismURL = process.env.L2_URL
const l2Provider = new JsonRpcProvider(optimismURL)
const l2Wallet = new Wallet(process.env.L2_USER_PRIVATE_KEY, l2Provider)
console.log('wallet addr', l2Wallet.address)

const SimpleStorageJson = require('../contracts/SimpleStorage.json')

let SimpleStorage
let L2Messenger

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const deploySimpleStorage = async () => {
	if(process.env.L2_SIMPLE_STORAGE_ADDRESS) {
		SimpleStorage = new Contract(process.env.L2_SIMPLE_STORAGE_ADDRESS, SimpleStorageJson.abi, l2Wallet)
		console.log(green('Using existing L2 SimpleStorage at', SimpleStorage.address))
		return
	}
	const SimpleStorageFactory = new ContractFactory(SimpleStorageJson.abi, SimpleStorageJson.bytecode, l2Wallet)
	SimpleStorage = await SimpleStorageFactory.deploy()
	console.log(green('Deployed L2 SimpleStorage to', SimpleStorage.address))
	await sleep(3000)
}

const setStorageLoop = async () => {
	for (let i = 10; i < 100; i++) {
		const val = '0x' + i.toString().repeat(32)
		console.log('setting SimpleStorage value to ', val)
		const setValueTx = await SimpleStorage.dumbSetValue(val)
		await setValueTx.wait()
		const contractVal = await SimpleStorage.value()
		console.log('SimpleStorage value:', contractVal)
		console.log(green('sleeping', process.env.SEND_TX_INTERVAL, 'seconds...'))
		await sleep(process.env.SEND_TX_INTERVAL * 1000)
	}
}

async function runner() {
	try {
		await deploySimpleStorage()
		while(true) {
			await setStorageLoop()
		}
	} catch (err) {
		console.error(red('Error detected:', err))
	}
}

module.exports = runner
