// recommended by https://nodejs.org/api/child_process.html#child_processexeccommand-options-callback
const util = require("util");
const exec = util.promisify(require("child_process").exec)

const assert = require("assert")

const {
    providers: { JsonRpcProvider },
    Wallet,
    Contract,
    utils: { parseEther }
} = require("ethers")
const { dev: { mainnet /* , xdai*/ } } = require("data-union-config")

const deployedDistributor = require("../deployments/dev/Distributor.json")

const env = {
    INPUT: "test/rewards-test.csv",
    ETHEREUM_URL: "http://localhost:8545",
    BATCH_SIZE: 7,
    SLEEP_MS: 0,
    KEY: "0x5e98cce00cff5dea6b454889f359a4ec06b9fa6b88e9d69b86de8e1c81887da0",
    ADDRESS: deployedDistributor.address,
}

const provider = new JsonRpcProvider(mainnet.url)
const wallet = new Wallet(env.KEY, provider)

const TokenJson = require("../artifacts/contracts/TestToken.sol/TestToken.json")
const token = new Contract(mainnet.token, TokenJson.abi, wallet)

// const log = require("debug")("Streamr:distributor:test")

describe("Rewards distribution", () => {
    it("happy path works", async function() {
        this.timeout(60000)
        const tx = await token.mint(deployedDistributor.address, parseEther("1000"))
        const tr = await tx.wait()
        assert.deepEqual(tr.events.map(e => e.event), ["Transfer"])

        console.log("Token: %s", mainnet.token)
        console.log("Distributor: %s", deployedDistributor.address)
        console.log("Balance: %s", (await token.balanceOf(deployedDistributor.address)).toString())

        console.log("Starting with env = %o", env)
        const { stdout, stderr } = await exec(`${process.execPath} index.js`, { env })
        console.log("stdout:", stdout);
        console.error("stderr:", stderr);
    })
})
