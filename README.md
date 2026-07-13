# Token Sale Escrow

A fixed-price token sale escrow built with Solidity, Hardhat, and OpenZeppelin. Deployed and verified on the BNB Smart Chain Testnet.

## 1. Project Purpose
This project is an ERC-20 token sale platform designed to facilitate secure token swaps between a token creator (seller) and investors (buyers). The escrow contract securely holds the sale tokens (TSALE) and allows buyers to purchase them using a stablecoin (mUSDT) at a fixed exchange rate. It acts as an intermediary to guarantee trustless execution of trades and enforces fair-launch principles like per-wallet purchase caps.

## 2. Contract Architecture
The system consists of three main smart contracts:
- **MockUSDT (ERC-20)**: A mock stablecoin with 6 decimals serving as the payment token. It includes minting capabilities for testing purposes.
- **TSaleToken (ERC-20)**: The actual token being sold to investors, with standard 18 decimals.
- **TokenSaleEscrow**: The core logic contract. It stores the fixed exchange rate, tracks buyer allocations, enforces purchase limits, and holds the TSALE inventory. The owner has administrative controls to pause sales or withdraw collected mUSDT.

## 3. Token Purchase Flow
1. The **Owner** deploys the contracts and funds the `TokenSaleEscrow` with a supply of TSALE tokens.
2. The **Buyer** approves the `TokenSaleEscrow` contract to spend their `MockUSDT`.
3. The **Buyer** calls the `buyTokens(amount)` function on the escrow contract.
4. The escrow contract calculates the cost based on the fixed rate.
5. The contract transfers `MockUSDT` from the buyer to itself.
6. The contract transfers the purchased `TSALE` tokens to the buyer.

## 4. Purchase-Limit Logic
To prevent whales from dominating the token sale, a per-wallet purchase cap is enforced:
- A `maxPurchasePerWallet` state variable is set during contract deployment.
- A mapping `purchasedAmount[buyerAddress]` tracks how many tokens each wallet has bought so far.
- When `buyTokens(amount)` is called, the contract checks: `require(purchasedAmount[msg.sender] + amount <= maxPurchasePerWallet, "Exceeds purchase limit")`.
- If the limit is exceeded, the transaction reverts.

## 5. Setup Instructions
1. Clone the repository and install dependencies:
```bash
npm install
```
2. Create a `.env` file based on `.env.example` and populate it:
```env
PRIVATE_KEY=your_wallet_private_key
BSCSCAN_API_KEY=your_bscscan_api_key
BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.bnbchain.org:8545
```

## 6. Compilation
Compile the smart contracts using Hardhat:
```bash
npm run compile
```

## 7. Test Commands
Run the comprehensive automated test suite (testing edge cases, access control, and token math):
```bash
npm test
```

## 8. Deployment Commands
Deploy the contracts to the BSC Testnet. This will deploy the tokens and the escrow contract, fund the escrow, and save the deployment addresses:
```bash
npm run deploy:testnet
```
After deployment, verify the contracts on BscScan and Sourcify:
```bash
npm run verify:testnet
```

## 9. Contract Addresses (BSC Testnet)
- **MockUSDT**: `0x34933043Fb3cdf9F2DfFa3e31bbe4f5bD3956Ba6`
- **TSaleToken**: `0xDD82d807B7fF04b1Fee90Cd4A73Edf8903Fdc7c8`
- **TokenSaleEscrow**: `0x7D66F9066776b19009D960d82912d1Afc29d05aF`

## 10. BscScan Links & Sample Transactions
- **MockUSDT**: [View on BscScan](https://testnet.bscscan.com/address/0x34933043Fb3cdf9F2DfFa3e31bbe4f5bD3956Ba6#code)
- **TSaleToken**: [View on BscScan](https://testnet.bscscan.com/address/0xDD82d807B7fF04b1Fee90Cd4A73Edf8903Fdc7c8#code)
- **TokenSaleEscrow**: [View on BscScan](https://testnet.bscscan.com/address/0x7D66F9066776b19009D960d82912d1Afc29d05aF#code)

*Sample Deployment Transaction*: `<insert_deployment_tx_hash>`
*Sample Purchase Transaction*: `<insert_purchase_tx_hash>`

## 11. Important Security Considerations
- **Pausability**: The contract inherits OpenZeppelin's `Pausable`. In the event of a vulnerability, the owner can pause token purchases to protect investor funds.
- **Access Control**: Administrative functions (withdrawing funds, recovering stuck tokens) are protected by OpenZeppelin's `Ownable` modifier.
- **SafeERC20**: The contract should utilize OpenZeppelin's `SafeERC20` wrapper for all token transfers to prevent silent failures from non-standard ERC-20 implementations.
- **Reentrancy**: Since the contract interacts with external token contracts, a reentrancy guard (`ReentrancyGuard`) is recommended to prevent nested calls during token transfers.
- **Precision/Decimals**: The contract handles token swaps between a 6-decimal token (USDT) and an 18-decimal token (TSALE). The math for the fixed rate must strictly account for this 12-decimal difference to prevent under-pricing or over-pricing tokens.