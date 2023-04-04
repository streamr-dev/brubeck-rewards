// "new format": address,reward with no quotes or anything like that
// e.g.: 0x0001D577750221C08bEF4A908833f855eAf27243,39.5038420844966

// also no state file (for smaller batches, manual restart/recovery using START index variable)
// TODO: re-add stipend check!

import { providers, Contract, Wallet, Overrides } from "ethers"
import { getAddress, formatEther, parseUnits } from "ethers/lib/utils"

const { JsonRpcProvider } = providers

const {
    ETHEREUM_URL = "https://polygon-rpc.com",
    GASPRICE_GWEI = "100",
    KEY,
    ADDRESS,
    TARGET,
    YES,
} = process.env

if (!KEY) { throw new Error("KEY environment variable is required for signing `send` transactions") }
if (!ADDRESS) { throw new Error("ADDRESS environment variable is required: the Distributor contract address") }
if (!TARGET) { throw new Error("TARGET environment variable is required: where the leftovers should go") }

const gasPrice = parseUnits(GASPRICE_GWEI, "gwei")

const provider = new JsonRpcProvider(ETHEREUM_URL)
const wallet = new Wallet(KEY, provider)
const targetAddress = getAddress(TARGET)

const DistributorJson = require("../deployments/matic/Distributor.json")
const contractAddress = getAddress(ADDRESS || DistributorJson.address)
const distributor = new Contract(contractAddress, DistributorJson.abi, wallet)

const TokenJson = require("../artifacts/contracts/TestToken.sol/TestToken.json")

async function main() {
    console.log("Connected to network %o", await provider.getNetwork())

    const tokenAddress = await distributor.token()
    const token = new Contract(tokenAddress, TokenJson.abi, wallet)
    const tokenBalance = await token.balanceOf(contractAddress)
    console.log("Token balance: %s", formatEther(tokenBalance))
    console.log("Sending it to: %s", targetAddress)

    if (YES !== "1") {
        throw new Error("If you are sure this is correct, run again with YES=1")
    }

    const opts: Overrides = { gasPrice }
    const tx = await distributor.send([targetAddress], [tokenBalance], opts)
    console.log("Sent tx: https://polygonscan.com/tx/%s", tx.hash)
    const tr = await tx.wait()
    console.log("Tx complete, gas spent: %s", tr.gasUsed.toString())
}
main().catch(console.error)
