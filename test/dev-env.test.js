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

const distributorDeploymentJson = require("../deployments/dev/Distributor.json")

const env = {
    INPUT: "test/rewards-test.csv",
    ETHEREUM_URL: "http://localhost:8545",
    BATCH_SIZE: 7,
    SLEEP_MS: 0,
    KEY: "0x5e98cce00cff5dea6b454889f359a4ec06b9fa6b88e9d69b86de8e1c81887da0",
    STATE_FILE_NAME: "",
    ADDRESS: distributorDeploymentJson.address,
}

const provider = new JsonRpcProvider(mainnet.url)
const wallet = new Wallet(env.KEY, provider)

const TokenJson = require("../artifacts/contracts/TestToken.sol/TestToken.json")
const token = new Contract(mainnet.token, TokenJson.abi, wallet)

const DistributorJson = require("../artifacts/contracts/Distributor.sol/Distributor.json")
const distributor = new Contract(distributorDeploymentJson.address, DistributorJson.abi, wallet)

describe("Rewards distribution", () => {
    it("happy path works", async function() {
        this.timeout(60000)

        // send tokens and native tokens to the contract
        const tx = await token.mint(distributor.address, parseEther("1000"))
        const tr = await tx.wait()
        assert.deepEqual(tr.events.map(e => e.event), ["Transfer"])
        const tx2 = await wallet.sendTransaction({
            to: distributor.address,
            value: parseEther("1000"),
        })
        await tx2.wait()
        const nativeBalanceBefore = await provider.getBalance(distributor.address)
        assert(nativeBalanceBefore.gt(0))

        console.log("Starting with env = %o", env)
        const { stderr } = await exec(`${process.execPath} index.js`, { env })
        assert.equal(stderr, "")

        // pick random sample from rewards-test.csv
        const targetAddress = "0x0001D577750221C08bEF4A908833f855eAf27243"
        const targetAmount = parseEther("39.5038420844966")
        const targetBalance = await token.balanceOf(targetAddress)
        console.log("Expect: %s", targetAmount.toString())
        console.log("Actual: %s", targetBalance.toString())
        assert(targetBalance.gte(targetAmount))
        const nativeBalance = await provider.getBalance(targetAddress)
        console.log("Native: %s", nativeBalance.toString())
        assert(nativeBalance.gte(parseEther("0.009")))

        console.log("All done, withdrawing...")
        const withdrawTx = await distributor.withdrawAll()
        await withdrawTx.wait()
        const tokenBalanceAfter = await token.balanceOf(distributor.address)
        const nativeBalanceAfter = await provider.getBalance(distributor.address)
        assert.equal(nativeBalanceAfter.toString(), "0")
        assert.equal(tokenBalanceAfter.toString(), "0")
    })
})
