module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy } = deployments
    const { deployer, DATA } = await getNamedAccounts()
    await deploy("Distributor", {
        from: deployer,
        args: [DATA],
        log: true,
    })
}
module.exports.tags = ["Distributor"]
