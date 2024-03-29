// "old format": "index","address",reward i.e. index and address are quoted, reward is not
// e.g.: "1","0x00000a9A7c4Afe3DB554a2df54e9a0ec9d485080",0.37808553932401

const fs = require("fs/promises")
const {
    providers: { JsonRpcProvider },
    Wallet,
    Contract,
    utils: { getAddress, parseEther, formatEther }
} = require("ethers")

const {
    INPUT = "data/2021-11-22-testnet.csv",
    START = "",
    END = "Infinity",
    BATCH_SIZE = "100",
    SLEEP_MS = "1000",
    ETHEREUM_URL = "http://localhost:8545",
    STATE_FILE_NAME = "last_rewarded_index.txt",
    KEY,
    ADDRESS,
} = process.env

if (!KEY) { throw new Error("KEY environment variable is required for signing `send` transactions") }
if (!ADDRESS) { throw new Error("ADDRESS environment variable is required: the Distributor contract address") }

const batchSize = +BATCH_SIZE
const sleepMs = +SLEEP_MS

const provider = new JsonRpcProvider(ETHEREUM_URL)
const wallet = new Wallet(KEY, provider)

const DistributorJson = require("../../deployments/matic/Distributor.json")
const contractAddress = getAddress(ADDRESS || DistributorJson.address)
const distributor = new Contract(contractAddress, DistributorJson.abi, wallet)

const TokenJson = require("../../artifacts/contracts/TestToken.sol/TestToken.json")

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

async function sendRewards(targets) {
    const first = targets[0]
    const last = targets[targets.length - 1]
    console.log("Sending indexes %s...%s, addresses %s...%s", first.index, last.index, first.address, last.address)

    const addresses = targets.map(({ address }) => address)
    const amounts = targets.map(({ reward }) => reward)
    const tx = await distributor.send(addresses, amounts)
    console.log("Sent tx: https://polygonscan.com/tx/%s", tx.hash)
    const tr = await tx.wait()
    console.log("Tx complete, gas spent: %s", tr.gasUsed.toString())

    // persist the last rewarded index for automatic recovery
    if (STATE_FILE_NAME) {
        await fs.writeFile(STATE_FILE_NAME, last.index)
    }
}

async function main() {
    console.log("Connected to network %o", await provider.getNetwork())

    const lastRewardedIndex = +await fs.readFile(STATE_FILE_NAME, "utf8").then(JSON.parse).catch(() => -1) // ignore missing file
    const startIndex = START !== "" ? +START : lastRewardedIndex // csv file is 1-indexed so this actually works out fine
    const rawInput = (await fs.readFile(INPUT, "utf8")).split("\n").slice(startIndex, END)
    let sum = parseEther("0")
    const input = rawInput.map(line => {
        const [index, rawAddress, floatReward] = line.split(",")
        const address = getAddress(rawAddress.slice(1, -1)) // remove quotes
        const reward = parseEther(floatReward.toString())
        sum = sum.add(reward)
        return { index, address, reward }
    })
    console.log("Starting from index %d, %d in total, distributing %s tokens in total", startIndex, input.length, formatEther(sum))

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
