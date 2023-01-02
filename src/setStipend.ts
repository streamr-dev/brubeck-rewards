
import { providers, Contract, Wallet, Event } from "ethers"
import { getAddress, parseEther, formatEther, parseUnits } from "ethers/lib/utils"

const { JsonRpcProvider } = providers

const {
    STIPEND_MATIC = "",
    GASPRICE_GWEI = "100",
    ETHEREUM_URL = "https://polygon-rpc.com",
    KEY,
    ADDRESS,
} = process.env

if (!KEY) { throw new Error("KEY environment variable is required for signing `send` transactions") }
if (!ADDRESS) { throw new Error("ADDRESS environment variable is required: the Distributor contract address") }
if (STIPEND_MATIC === "") { throw new Error("STIPEND_MATIC environment variable is required") }

const stipendWei = parseEther(STIPEND_MATIC)
const gasPrice = parseUnits(GASPRICE_GWEI, "gwei")
// 1e30 = 1e18 * 1e12, where 1e12 is probably too little to do anything useful
if (stipendWei.gt("1000000000000000000000000000000")) { throw new Error("STIPEND_MATIC should be full MATIC units, not wei, e.g. '0.01'") }

const provider = new JsonRpcProvider(ETHEREUM_URL)
const wallet = new Wallet(KEY, provider)

const DistributorJson = require("../deployments/matic/Distributor.json")
const contractAddress = getAddress(ADDRESS || DistributorJson.address)
const distributor = new Contract(contractAddress, DistributorJson.abi, wallet)

async function main() {
    console.log("Connected to network %o", await provider.getNetwork())

    const oldStipendWei = await distributor.stipend()
    if (oldStipendWei.eq(stipendWei)) {
        throw new Error(`Stipend already set to ${formatEther(stipendWei)} MATIC`)
    }
    const tx = await distributor.setStipend(stipendWei, { gasPrice })
    console.log("Sending tx %s", tx.hash)
    const tr = await tx.wait()
    console.log("Got events: %o", tr.events.map((e: Event) => e.event))
}
main().catch(console.error)
