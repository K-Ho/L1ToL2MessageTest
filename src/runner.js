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
const l2Wallet = new Wallet(process.env.L2_USER_PRIVATE_KEY, l2Provider)

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

const deployProxyL2Messenger = async () => {
	const Proxy_L2MessengerFactory = new ContractFactory(proxyL2MessengerJSON.abi, proxyL2MessengerJSON.bytecode, l2Wallet)
	ProxyL2Messenger = await Proxy_L2MessengerFactory.deploy()
	await ProxyL2Messenger.deployTransaction.wait()
	console.log(green('Deployed ProxyL2Messenger to', ProxyL2Messenger.address))
	console.log(green('deployment tx: http://https://l2-explorer.surge.sh/tx/' + ProxyL2Messenger.deployTransaction.hash))
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
	await l2Provider.waitForTransaction(l2ToL1Tx.hash)
	console.log(green('L2->L1 setValue tx complete: http://https://l2-explorer.surge.sh/tx/' + l2ToL1Tx.hash))
	const count = (await SimpleStorage.totalCount()).toString()
	const sccAbi = [
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_libAddressManager",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "_fraudProofWindow",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_sequencerPublishWindow",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "_batchIndex",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "bytes32",
          "name": "_batchRoot",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "_batchSize",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "_prevTotalElements",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "bytes",
          "name": "_extraData",
          "type": "bytes"
        }
      ],
      "name": "StateBatchAppended",
      "type": "event"
    },
    {
      "inputs": [],
      "name": "FRAUD_PROOF_WINDOW",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "SEQUENCER_PUBLISH_WINDOW",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32[]",
          "name": "_batch",
          "type": "bytes32[]"
        },
        {
          "internalType": "uint256",
          "name": "_shouldStartAtElement",
          "type": "uint256"
        }
      ],
      "name": "appendStateBatch",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "_id",
          "type": "bytes32"
        },
        {
          "internalType": "uint256",
          "name": "_index",
          "type": "uint256"
        }
      ],
      "name": "canOverwrite",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "batchIndex",
              "type": "uint256"
            },
            {
              "internalType": "bytes32",
              "name": "batchRoot",
              "type": "bytes32"
            },
            {
              "internalType": "uint256",
              "name": "batchSize",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "prevTotalElements",
              "type": "uint256"
            },
            {
              "internalType": "bytes",
              "name": "extraData",
              "type": "bytes"
            }
          ],
          "internalType": "struct Lib_OVMCodec.ChainBatchHeader",
          "name": "_batchHeader",
          "type": "tuple"
        }
      ],
      "name": "deleteStateBatch",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getLastSequencerTimestamp",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "_lastSequencerTimestamp",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getTotalBatches",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "_totalBatches",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getTotalElements",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "_totalElements",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "init",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "batchIndex",
              "type": "uint256"
            },
            {
              "internalType": "bytes32",
              "name": "batchRoot",
              "type": "bytes32"
            },
            {
              "internalType": "uint256",
              "name": "batchSize",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "prevTotalElements",
              "type": "uint256"
            },
            {
              "internalType": "bytes",
              "name": "extraData",
              "type": "bytes"
            }
          ],
          "internalType": "struct Lib_OVMCodec.ChainBatchHeader",
          "name": "_batchHeader",
          "type": "tuple"
        }
      ],
      "name": "insideFraudProofWindow",
      "outputs": [
        {
          "internalType": "bool",
          "name": "_inside",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "_name",
          "type": "string"
        }
      ],
      "name": "resolve",
      "outputs": [
        {
          "internalType": "address",
          "name": "_contract",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "batchIndex",
              "type": "uint256"
            },
            {
              "internalType": "bytes32",
              "name": "batchRoot",
              "type": "bytes32"
            },
            {
              "internalType": "uint256",
              "name": "batchSize",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "prevTotalElements",
              "type": "uint256"
            },
            {
              "internalType": "bytes",
              "name": "extraData",
              "type": "bytes"
            }
          ],
          "internalType": "struct Lib_OVMCodec.ChainBatchHeader",
          "name": "_stateBatchHeader",
          "type": "tuple"
        },
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "timestamp",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "blockNumber",
              "type": "uint256"
            },
            {
              "internalType": "enum Lib_OVMCodec.QueueOrigin",
              "name": "l1QueueOrigin",
              "type": "uint8"
            },
            {
              "internalType": "address",
              "name": "l1TxOrigin",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "entrypoint",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "gasLimit",
              "type": "uint256"
            },
            {
              "internalType": "bytes",
              "name": "data",
              "type": "bytes"
            }
          ],
          "internalType": "struct Lib_OVMCodec.Transaction",
          "name": "_transaction",
          "type": "tuple"
        },
        {
          "components": [
            {
              "internalType": "bool",
              "name": "isSequenced",
              "type": "bool"
            },
            {
              "internalType": "uint256",
              "name": "queueIndex",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "timestamp",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "blockNumber",
              "type": "uint256"
            },
            {
              "internalType": "bytes",
              "name": "txData",
              "type": "bytes"
            }
          ],
          "internalType": "struct Lib_OVMCodec.TransactionChainElement",
          "name": "_txChainElement",
          "type": "tuple"
        },
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "batchIndex",
              "type": "uint256"
            },
            {
              "internalType": "bytes32",
              "name": "batchRoot",
              "type": "bytes32"
            },
            {
              "internalType": "uint256",
              "name": "batchSize",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "prevTotalElements",
              "type": "uint256"
            },
            {
              "internalType": "bytes",
              "name": "extraData",
              "type": "bytes"
            }
          ],
          "internalType": "struct Lib_OVMCodec.ChainBatchHeader",
          "name": "_txBatchHeader",
          "type": "tuple"
        },
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "index",
              "type": "uint256"
            },
            {
              "internalType": "bytes32[]",
              "name": "siblings",
              "type": "bytes32[]"
            }
          ],
          "internalType": "struct Lib_OVMCodec.ChainInclusionProof",
          "name": "_txInclusionProof",
          "type": "tuple"
        }
      ],
      "name": "setLastOverwritableIndex",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "_element",
          "type": "bytes32"
        },
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "batchIndex",
              "type": "uint256"
            },
            {
              "internalType": "bytes32",
              "name": "batchRoot",
              "type": "bytes32"
            },
            {
              "internalType": "uint256",
              "name": "batchSize",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "prevTotalElements",
              "type": "uint256"
            },
            {
              "internalType": "bytes",
              "name": "extraData",
              "type": "bytes"
            }
          ],
          "internalType": "struct Lib_OVMCodec.ChainBatchHeader",
          "name": "_batchHeader",
          "type": "tuple"
        },
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "index",
              "type": "uint256"
            },
            {
              "internalType": "bytes32[]",
              "name": "siblings",
              "type": "bytes32[]"
            }
          ],
          "internalType": "struct Lib_OVMCodec.ChainInclusionProof",
          "name": "_proof",
          "type": "tuple"
        }
      ],
      "name": "verifyStateCommitment",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
	]
	const ctcAbi = [
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_libAddressManager",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "_forceInclusionPeriodSeconds",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "_startingQueueIndex",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "_numQueueElements",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "_totalElements",
          "type": "uint256"
        }
      ],
      "name": "QueueBatchAppended",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "_startingQueueIndex",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "_numQueueElements",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "_totalElements",
          "type": "uint256"
        }
      ],
      "name": "SequencerBatchAppended",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "_batchIndex",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "bytes32",
          "name": "_batchRoot",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "_batchSize",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "_prevTotalElements",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "bytes",
          "name": "_extraData",
          "type": "bytes"
        }
      ],
      "name": "TransactionBatchAppended",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "_l1TxOrigin",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "_target",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "_gasLimit",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "bytes",
          "name": "_data",
          "type": "bytes"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "_queueIndex",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "_timestamp",
          "type": "uint256"
        }
      ],
      "name": "TransactionEnqueued",
      "type": "event"
    },
    {
      "inputs": [],
      "name": "L2_GAS_DISCOUNT_DIVISOR",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "MAX_ROLLUP_TX_SIZE",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "MIN_ROLLUP_TX_GAS",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_numQueuedTransactions",
          "type": "uint256"
        }
      ],
      "name": "appendQueueBatch",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "appendSequencerBatch",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_target",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "_gasLimit",
          "type": "uint256"
        },
        {
          "internalType": "bytes",
          "name": "_data",
          "type": "bytes"
        }
      ],
      "name": "enqueue",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getNextQueueIndex",
      "outputs": [
        {
          "internalType": "uint40",
          "name": "",
          "type": "uint40"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getNumPendingQueueElements",
      "outputs": [
        {
          "internalType": "uint40",
          "name": "",
          "type": "uint40"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_index",
          "type": "uint256"
        }
      ],
      "name": "getQueueElement",
      "outputs": [
        {
          "components": [
            {
              "internalType": "bytes32",
              "name": "queueRoot",
              "type": "bytes32"
            },
            {
              "internalType": "uint40",
              "name": "timestamp",
              "type": "uint40"
            },
            {
              "internalType": "uint40",
              "name": "blockNumber",
              "type": "uint40"
            }
          ],
          "internalType": "struct Lib_OVMCodec.QueueElement",
          "name": "_element",
          "type": "tuple"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getTotalBatches",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "_totalBatches",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getTotalElements",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "_totalElements",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "init",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "_name",
          "type": "string"
        }
      ],
      "name": "resolve",
      "outputs": [
        {
          "internalType": "address",
          "name": "_contract",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "timestamp",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "blockNumber",
              "type": "uint256"
            },
            {
              "internalType": "enum Lib_OVMCodec.QueueOrigin",
              "name": "l1QueueOrigin",
              "type": "uint8"
            },
            {
              "internalType": "address",
              "name": "l1TxOrigin",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "entrypoint",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "gasLimit",
              "type": "uint256"
            },
            {
              "internalType": "bytes",
              "name": "data",
              "type": "bytes"
            }
          ],
          "internalType": "struct Lib_OVMCodec.Transaction",
          "name": "_transaction",
          "type": "tuple"
        },
        {
          "components": [
            {
              "internalType": "bool",
              "name": "isSequenced",
              "type": "bool"
            },
            {
              "internalType": "uint256",
              "name": "queueIndex",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "timestamp",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "blockNumber",
              "type": "uint256"
            },
            {
              "internalType": "bytes",
              "name": "txData",
              "type": "bytes"
            }
          ],
          "internalType": "struct Lib_OVMCodec.TransactionChainElement",
          "name": "_txChainElement",
          "type": "tuple"
        },
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "batchIndex",
              "type": "uint256"
            },
            {
              "internalType": "bytes32",
              "name": "batchRoot",
              "type": "bytes32"
            },
            {
              "internalType": "uint256",
              "name": "batchSize",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "prevTotalElements",
              "type": "uint256"
            },
            {
              "internalType": "bytes",
              "name": "extraData",
              "type": "bytes"
            }
          ],
          "internalType": "struct Lib_OVMCodec.ChainBatchHeader",
          "name": "_batchHeader",
          "type": "tuple"
        },
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "index",
              "type": "uint256"
            },
            {
              "internalType": "bytes32[]",
              "name": "siblings",
              "type": "bytes32[]"
            }
          ],
          "internalType": "struct Lib_OVMCodec.ChainInclusionProof",
          "name": "_inclusionProof",
          "type": "tuple"
        }
      ],
      "name": "verifyTransaction",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ]
	const scc = new Contract('0x6F239103bD7d869FE983215B009A3544C9640b60', sccAbi, l1Wallet)
	const ctc = new Contract('0x9934fc453d11334e6bfbe5d3856a2c0e917d26f1', ctcAbi, l1Wallet)
	while (true) {
		console.log('scc fraud proof window', await scc.FRAUD_PROOF_WINDOW())
		console.log('scc total elements', await scc.getTotalElements())
		console.log('ctc total elements', await ctc.getTotalElements())
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
		// await deployProxyL2Messenger()
		// await deployProxyL2Messenger()
		// while(true) {
		// 	await withdraw()
		// }
	} catch (err) {
		console.error(red('Error detected:', err))
	}
}

module.exports = runner
