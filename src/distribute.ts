// "new format": address,reward with no quotes or anything like that
// e.g.: 0x0001D577750221C08bEF4A908833f855eAf27243,39.5038420844966

// also no state file (for smaller batches, manual restart/recovery using START index variable)
// TODO: re-add stipend check!

import { readFile } from "fs/promises"
import { providers, Contract, Wallet, BigNumber, Overrides } from "ethers"
import { getAddress, parseEther, formatEther, parseUnits } from "ethers/lib/utils"

const { JsonRpcProvider } = providers

const {
    INPUT,
    START = "0",
    END = "Infinity",
    BATCH_SIZE = "100",
    SLEEP_MS = "1000",
    GASPRICE_GWEI = "100",
    ETHEREUM_URL = "https://polygon-rpc.com",
    KEY,
    ADDRESS,
} = process.env

if (!KEY) { throw new Error("KEY environment variable is required for signing `send` transactions") }
if (!ADDRESS) { throw new Error("ADDRESS environment variable is required: the Distributor contract address") }
if (!INPUT) { throw new Error("INPUT environment variable is required: the rewards csv file") }

const batchSize = +BATCH_SIZE
const sleepMs = +SLEEP_MS
const startIndex = +START

const gasPrice = parseUnits(GASPRICE_GWEI, "gwei")

const provider = new JsonRpcProvider(ETHEREUM_URL)
const wallet = new Wallet(KEY, provider)

const DistributorJson = require("../deployments/matic/Distributor.json")
const contractAddress = getAddress(ADDRESS || DistributorJson.address)
const distributor = new Contract(contractAddress, DistributorJson.abi, wallet)

const TokenJson = require("../artifacts/contracts/TestToken.sol/TestToken.json")

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

type Target = {
    index: number
    address: string
    reward: BigNumber
}

const forbiddenAddresses = new Set([
    "0x3a9A81d576d83FF21f26f325066054540720fC34",
    "0x0000000000000000000000000000000000000000",
])

/**
 * If the recipient is a smart contract that can't receive native tokens (MATIC), then if we try to send a stipend, the contract will revert. Ouch.
 * Weed out the bad addresses with something like a binary search (we assume most addresses are good)
 * @returns gasLimit if all addresses are good, undefined if some addresses were bad. This is to save a gas estimation call if all addresses were good.
 */
async function filterAddresses(addresses: string[], amounts: BigNumber[]): Promise<{ addresses: string[], amounts: BigNumber[], failed: string[], gasLimit?: BigNumber }> {
    // console.log("filterAddresses: %o", addrs)
    if (addresses.length < 1) { throw new Error("filterAddresses: empty addresses array") }
    if (addresses.length !== amounts.length) { throw new Error("filterAddresses: addresses and amounts arrays have different lengths") }

    let gasLimit = BigNumber.from(0)
    try {
        gasLimit = await distributor.estimateGas.send(addresses, amounts, { gasPrice })
        return { addresses, amounts, failed: [], gasLimit }
    } catch (e) {
        const error = e as Error
        if (!error.message.includes("Reverted")) { throw error }
    }
    // found it!
    if (addresses.length === 1) {
        return { addresses: [], amounts: [], failed: addresses, gasLimit: BigNumber.from(0) }
    }
    const partitionIndex = Math.floor(addresses.length / 2)
    const left = await filterAddresses(addresses.slice(0, partitionIndex), amounts.slice(0, partitionIndex))
    const right = await filterAddresses(addresses.slice(partitionIndex), amounts.slice(partitionIndex))
    return {
        addresses: left.addresses.concat(right.addresses),
        amounts: left.amounts.concat(right.amounts),
        failed: left.failed.concat(right.failed),
    }
}

async function sendRewards(targets: Target[]) {
    const first = targets[0]
    const last = targets[targets.length - 1]
    // +1 to make line numbers 1-indexed like in editors such as VSCode ;)
    console.log("Sending at index %s, lines %s...%s, addresses %s...%s", first.index, first.index + 1, last.index + 1, first.address, last.address)
    const addresses = targets.map(({ address }) => address)
    const amounts = targets.map(({ reward }) => reward)

    const filtered = await filterAddresses(addresses, amounts)

    if (filtered.failed.length > 0) {
        console.log("Addresses that will be skipped: %o", filtered.failed)
    }

    const opts: Overrides = { gasPrice }
    if (filtered.gasLimit) { opts.gasLimit = filtered.gasLimit } // if there were no failed addresses, skip re-asking the gas limit
    const tx = await distributor.send(filtered.addresses, filtered.amounts, opts)
    console.log("Sent tx: https://polygonscan.com/tx/%s", tx.hash)
    const tr = await tx.wait()
    console.log("Tx complete, gas spent: %s", tr.gasUsed.toString())
}

async function main() {
    console.log("Connected to network %o", await provider.getNetwork())

    const rawInput = (await readFile(INPUT!, "utf8")).split("\n").slice(startIndex, +END)
    let sum = parseEther("0")
    const input = rawInput
        .map((line, i): Target => {
            const [rawAddress, floatReward] = line.split(",")
            // console.log("%s: %s, %s", index, rawAddress, floatReward)
            const address = getAddress(rawAddress)
            const reward = parseEther(floatReward.toString().slice(0, 20)) // remove decimals past 18th, otherwise parseEther throws
            sum = sum.add(reward)
            const index = startIndex + i
            return { index, address, reward }
        })
        .filter(target => target.reward.gt(0)) // filter out zero reward lines
        .filter(target => !forbiddenAddresses.has(target.address)) // filter out stupid stuff like DATA address
    console.log("Starting from index %d, %d in total, distributing %s tokens in total", START, input.length, formatEther(sum))

    const tokenAddress = await distributor.token()
    const token = new Contract(tokenAddress, TokenJson.abi, wallet)
    const tokenBalance = await token.balanceOf(contractAddress)
    if (tokenBalance.lt(sum)) {
        throw new Error(`Not enough tokens in the contract ${contractAddress}: ${formatEther(tokenBalance)} < ${formatEther(sum)}, difference = ${formatEther(sum.sub(tokenBalance))}`)
    }
    const nativeBalance = await provider.getBalance(contractAddress)
    const stipendWei = await distributor.stipend()
    const nativeNeeded = stipendWei.mul(input.length)
    if (nativeBalance.lt(nativeNeeded)) {
        throw new Error(`Not enough ether in the contract ${contractAddress}: ${formatEther(nativeBalance)} < ${formatEther(nativeNeeded)}, difference = ${formatEther(nativeNeeded.sub(nativeBalance))}`)
    }

    for (let i = 0; i < input.length; i += batchSize) {
        await sendRewards(input.slice(i, i + batchSize))
        await sleep(sleepMs)
    }
}
main().catch(console.error)
