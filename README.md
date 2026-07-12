# Token Sale Escrow

A fixed-price token sale escrow built with Solidity, Hardhat, and OpenZeppelin.
Deployed and verified on BNB Smart Chain Testnet.

## Overview

This project includes a complete ERC-20 token sale flow:
- A seller funds an escrow contract with sale tokens (TSALE).
- Buyers pay with a stablecoin (mUSDT) at a fixed rate.
- The contract enforces a per-wallet purchase cap.
- The owner can pause the sale and withdraw collected funds.

## Contracts

- **MockUSDT**: 6 decimals payment token, mintable by owner for testing.
- **TSaleToken**: 18 decimals sale token.
- **TokenSaleEscrow**: The main escrow contract that handles purchases, enforces limits, and allows the owner to withdraw funds.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
Create a `.env` file based on `.env.example`:
```env
PRIVATE_KEY=your_private_key
BSCSCAN_API_KEY=your_bscscan_api_key
BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.bnbchain.org:8545
```

## Testing

Run the automated test suite locally:
```bash
npm test
```

## Deployment

Deploy the contracts to the BSC Testnet:
```bash
npm run deploy:testnet
```

Verify the contracts on BscScan:
```bash
npm run verify:testnet
```

Run a demo purchase and withdrawal flow:
```bash
npm run interact:testnet
```