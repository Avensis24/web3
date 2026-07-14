import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { defineConfig } from "hardhat/config";
import * as dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  plugins: [hardhatToolboxMochaEthers],
  solidity: {
    profiles: {
      default: {
        version: "0.8.24",
      },
      production: {
        version: "0.8.24",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhat: {
      type: "edr-simulated",
      chainType: "l1",
    },
    bscTestnet: {
      type: "http",
      chainId: 97,
      chainType: "l1",
      url: process.env.BSC_TESTNET_RPC || "https://data-seed-prebsc-1-s1.bnbchain.org:8545",
      accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : [],
    },
  },
  chainDescriptors: {
    97: {
      name: "bscTestnet",
      blockExplorers: {
        etherscan: {
          url: "https://testnet.bscscan.com",
        },
      },
    },
  },
  verify: {
    etherscan: {
      apiKey: process.env.BSCSCAN_API_KEY || "",
    },
    blockscout: {
      enabled: false,
    },
    sourcify: {
      enabled: false,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
});
