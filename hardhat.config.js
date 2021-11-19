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
        },
        matic: {
            chainId: 137,
            url: "https://polygon-rpc.com",
            accounts: [process.env.KEY || "0x5e98cce00cff5dea6b454889f359a4ec06b9fa6b88e9d69b86de8e1c81887da0"] // dummy key
        },
        bsc: {
            chainId: 56,
            url: "https://bsc-dataseed.binance.org/",
            accounts: [process.env.KEY || "0x5e98cce00cff5dea6b454889f359a4ec06b9fa6b88e9d69b86de8e1c81887da0"] // dummy key
        },
    },
    namedAccounts: {
        DATA: {
            1: "0x8f693ca8D21b157107184d29D398A8D082b38b76",
            100: "0x256eb8a51f382650B2A1e946b8811953640ee47D",
            56: "0x0864c156b3c5f69824564dec60c629ae6401bf2a",
            137: "0x3a9A81d576d83FF21f26f325066054540720fC34",
        },
        deployer: {
            default: 0, // take the first account as deployer
        }
    }
};
