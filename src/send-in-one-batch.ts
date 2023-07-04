// send whole csv file in one batch

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
    GASPRICE_GWEI = "100",
    ETHEREUM_URL = "https://polygon-rpc.com",
    KEY,
    ADDRESS,
} = process.env

if (!KEY) { throw new Error("KEY environment variable is required for signing `send` transactions") }
if (!ADDRESS) { throw new Error("ADDRESS environment variable is required: the Distributor contract address") }
if (!INPUT) { throw new Error("INPUT environment variable is required: the rewards csv file") }

const gasPrice = parseUnits(GASPRICE_GWEI, "gwei")

const provider = new JsonRpcProvider(ETHEREUM_URL)
const wallet = new Wallet(KEY, provider)

const DistributorJson = require("../deployments/matic/Distributor.json")
const contractAddress = getAddress(ADDRESS || DistributorJson.address)
const distributor = new Contract(contractAddress, DistributorJson.abi, wallet)

const TokenJson = require("../artifacts/contracts/TestToken.sol/TestToken.json")

type Target = {
    index: number
    address: string
    reward: BigNumber
}

const forbiddenAddresses = new Set([
    "0x3a9A81d576d83FF21f26f325066054540720fC34",
    "0x0000000000000000000000000000000000000000",
])

async function main() {
    console.log("Connected to network %o", await provider.getNetwork())

    const rawInput = (await readFile(INPUT!, "utf8")).split("\n")
    let sum = parseEther("0")
    const input = rawInput
        .map((line, index): Target => {
            const [rawAddress, floatReward] = line.split(",")
            // console.log("%s: %s, %s", index, rawAddress, floatReward)
            const address = getAddress(rawAddress.toLowerCase())
            const reward = parseEther(floatReward.toString().slice(0, 20)) // remove decimals past 18th, otherwise parseEther throws
            sum = sum.add(reward)
            return { index, address, reward }
        })
        .filter(target => target.reward.gt(0)) // filter out zero reward lines
        .filter(target => !forbiddenAddresses.has(target.address)) // filter out stupid stuff like DATA address
    console.log("Distributing %s tokens in total to %s addresses", formatEther(sum), input.length)

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

    const addresses = input.map(({ address }) => address)
    const amounts = input.map(({ reward }) => reward)

    const opts: Overrides = { gasPrice }
    const tx = await distributor.send(addresses, amounts, opts)
    console.log("Sent tx: https://polygonscan.com/tx/%s", tx.hash)
    const tr = await tx.wait()
    console.log("Tx complete, gas spent: %s", tr.gasUsed.toString())

}
main().catch(console.error)
