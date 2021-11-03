const { mainnet /* , xdai*/ } = require("data-union-config")[process.env.ENV || "dev"]

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()
    await deploy("Distributor", {
        from: deployer,
        args: [mainnet.token],
        log: true,
    })
}
module.exports.tags = ["Distributor"]
