require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("hardhat-deploy");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: "0.8.6",
    networks: {
        hardhat: {},
        dev_xdai: { // eslint-disable-line camelcase
            chainId: 8997,
            url: "http://localhost:8546",
            accounts: ["0x5e98cce00cff5dea6b454889f359a4ec06b9fa6b88e9d69b86de8e1c81887da0"]
        },
        dev: {
            chainId: 8995,
            url: "http://localhost:8545",
            accounts: ["0x5e98cce00cff5dea6b454889f359a4ec06b9fa6b88e9d69b86de8e1c81887da0"]
        },
        xdai: {
            chainId: 100,
            url: "https://rpc.xdaichain.com/",
            accounts: [process.env.KEY || "0x5e98cce00cff5dea6b454889f359a4ec06b9fa6b88e9d69b86de8e1c81887da0"] // dummy key
        },
        mainnet: {
            chainId: 1,
            url: `https://mainnet.infura.io/v3/${process.env.INFURA_KEY}` || "",
            accounts: [process.env.KEY || "0x5e98cce00cff5dea6b454889f359a4ec06b9fa6b88e9d69b86de8e1c81887da0"] // dummy key
        }
    },
    namedAccounts: {
        deployer: {
            default: 0, // take the first account as deployer
        }
    }
};
