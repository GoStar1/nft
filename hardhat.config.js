const fs = require('fs');

require('@nomiclabs/hardhat-waffle');

const privateKey = fs.readFileSync('.secret').toString().trim();

module.exports = {
  networks: {
    hardhat: {
      chainId: 1337,
    },
    bscTestnet: {
      url: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
      chainId: 97,
      accounts: [privateKey],
    },
    // Keep matic config for reference
    matic: {
      url: 'https://rpc-mumbai.maticvigil.com',
      accounts: [privateKey],
    },
  },
  solidity: '0.8.4',
};
