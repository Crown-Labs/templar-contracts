require("@nomiclabs/hardhat-waffle");
require('@nomiclabs/hardhat-ethers');

// Replace this private key with your Ropsten account private key
// To export your private key from Metamask, open Metamask and
// go to Account Details > Export Private Key
// Be aware of NEVER putting real Ether into testing accounts

// 0x083B4acb59B0D102740cDA8de8f31cB603091043
const { PRIVATE_KEY, MNEMONIC } = require('./.env');

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// deploy
module.exports = {
  solidity: {
     compilers: [
      {
        version: "0.7.5",
        settings: {
          optimizer: {
            enabled: true
          }
         }
      },
      {
        version: "0.7.6",
        settings: {
          optimizer: {
            enabled: true
          }
         }
      },
      {
        version: "0.8.6",
        settings: {
          optimizer: {
            enabled: true
          }
         }
      },
    ]
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 20000
  },
  networks: {
    hardhat: {
      forking: {
        url: "https://bsc.getblock.io/mainnet/?api_key=6cb196d6-25c9-4a9a-846b-e5308b92e4a9"
      }
    },
    rinkeby: {
      url: "https://rinkeby.infura.io/v3/4c3f9f00a2d44e98ac2b93a51f2c3a1f", //Infura url with projectId
      accounts: [`0x${PRIVATE_KEY}`]
    },
    testnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      gas: 2100000,
      gasPrice: 10000000000,
      accounts: {mnemonic: MNEMONIC}
    },
    /*mainnet: {
      url: "https://bsc-dataseed.binance.org/",
      chainId: 56,
      gasPrice: 20000000000,
      accounts: {mnemonic: mnemonic}
    }*/
    one_testnet: {
      url: `https://api.s0.b.hmny.io`,
      accounts: {mnemonic: MNEMONIC}
    },
  }
};
