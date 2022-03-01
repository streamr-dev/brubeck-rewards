// format2: address,reward with no quotes or anything like that
// e.g.: 0x0001D577750221C08bEF4A908833f855eAf27243,39.5038420844966

// also no state file (for smaller batches, manual restart/recovery using START index variable)
// TODO: re-add stipend check!

import { readFile } from "fs/promises"
import { providers, Contract, Wallet, BigNumber } from "ethers"
import { getAddress, parseEther, formatEther, parseUnits } from "ethers/lib/utils"

const { JsonRpcProvider } = providers

const {
    INPUT = "data/2022-03-01.csv",
    START = "0",
    END = "Infinity",
    BATCH_SIZE = "100",
    SLEEP_MS = "1000",
    GASPRICE_GWEI = "100",
    ETHEREUM_URL,
    KEY,
    ADDRESS,
} = process.env

if (!KEY) { throw new Error("KEY environment variable is required for signing `send` transactions") }
if (!ADDRESS) { throw new Error("ADDRESS environment variable is required: the Distributor contract address") }

const batchSize = +BATCH_SIZE
const sleepMs = +SLEEP_MS

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

async function sendRewards(targets: Target[]) {
    const first = targets[0]
    const last = targets[targets.length - 1]
    console.log("Sending indexes %s...%s, addresses %s...%s", first.index, last.index, first.address, last.address)

    const addresses = targets.map(({ address }) => address)
    const amounts = targets.map(({ reward }) => reward)
    const tx = await distributor.send(addresses, amounts, { gasPrice })
    console.log("Sent tx: https://polygonscan.com/tx/%s", tx.hash)
    const tr = await tx.wait()
    console.log("Tx complete, gas spent: %s", tr.gasUsed.toString())
}

async function main() {
    console.log("Connected to network %o", await provider.getNetwork())

    const rawInput = (await readFile(INPUT, "utf8")).split("\n").slice(+START, +END)
    let sum = parseEther("0")
    const input = rawInput.map((line, index): Target => {
        const [rawAddress, floatReward] = line.split(",")
        // console.log("%s: %s, %s", index, rawAddress, floatReward)
        const address = getAddress(rawAddress)
        const reward = parseEther(floatReward.toString().slice(0, 20)) // remove decimals past 18th, otherwise parseEther throws
        sum = sum.add(reward)
        return { index, address, reward }
    }).filter(target => target.reward.gt(0)) // filter out zero reward lines
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
