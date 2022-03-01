import { readFile } from "fs/promises"
import { providers, BigNumber, Contract } from "ethers"
import { getAddress, parseEther, formatEther } from "ethers/lib/utils"

const { JsonRpcProvider } = providers

const {
    INPUT = "data/2022-03-01.csv",
    START = "0",
    END = "Infinity",
    SLEEP_MS = "100",
    ETHEREUM_URL,
    ADDRESS,
} = process.env

if (!ADDRESS) { throw new Error("ADDRESS environment variable is required: the Distributor contract address") }

const sleepMs = +SLEEP_MS

const provider = new JsonRpcProvider(ETHEREUM_URL)

const DistributorJson = require("../deployments/matic/Distributor.json")
const contractAddress = getAddress(ADDRESS || DistributorJson.address)
const distributor = new Contract(contractAddress, DistributorJson.abi, provider)

const TokenJson = require("../artifacts/contracts/TestToken.sol/TestToken.json")

async function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

type Target = {
    index: number
    address: string
    reward: BigNumber
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
    })
    const stipendWei = await distributor.stipend()
    const totalStipends = stipendWei.mul(input.length)
    console.log("Starting from index %d, %d in total, expecting %s tokens and %s native-tokens in total", START, input.length, formatEther(sum), formatEther(totalStipends))

    const tokenAddress = await distributor.token()
    const token = new Contract(tokenAddress, TokenJson.abi, provider)
    const contractTokenBalance = await token.balanceOf(contractAddress)
    const contractNativeBalance = await provider.getBalance(contractAddress)
    console.log("%s tokens and %s native-tokens left in the contract", formatEther(contractTokenBalance), formatEther(contractNativeBalance))

    for (let i = 0; i < input.length; i += 1) {
        const { index, address, reward } = input[i]
        const tokenBalance = await token.balanceOf(address) as BigNumber
        const nativeBalance = await provider.getBalance(address) as BigNumber
        const tokenOK = tokenBalance.gte(reward)
        const nativeOK = nativeBalance.gte(stipendWei)
        console.log(`${tokenOK && nativeOK ? "[ OK ]" : "[fail]"} ${index} ${address}`)
        if (!tokenOK) { console.error(`${address} DATA  ${tokenBalance} < ${reward}`) }
        if (!nativeOK) { console.error(`${address} MATIC ${nativeBalance} < ${stipendWei}`) }
        await sleep(sleepMs)
    }
}
main().catch(console.error)
