# Token Sale Escrow

A fixed-price token sale escrow built with Solidity, Hardhat, and OpenZeppelin. Deployed and verified on the BNB Smart Chain Testnet.

---

## 1. Project Purpose
This project is an ERC-20 token sale platform designed to facilitate secure token swaps between a token creator (seller) and investors (buyers). The escrow contract securely holds the sale tokens (TSALE) and allows buyers to purchase them using a stablecoin (mUSDT) at a fixed exchange rate. It acts as an intermediary to guarantee trustless execution of trades and enforces fair-launch principles like per-wallet purchase caps.

---

## 2. Contract Architecture

The system consists of three smart contracts:

| Contract | Role |
|---|---|
| **MockUSDT** | Mock ERC-20 stablecoin (6 decimals) used as the payment token. Mintable by owner for testnet use. |
| **TSaleToken** | The ERC-20 sale token (18 decimals) that investors receive when purchasing. |
| **TokenSaleEscrow** | Core logic contract. Holds TSALE inventory, accepts mUSDT payments, enforces per-wallet purchase caps, and allows the owner to pause, withdraw funds, or recover unsold tokens. |

**Dependencies:** OpenZeppelin `Ownable`, `Pausable`, `ReentrancyGuard`, `SafeERC20`.

---

## 3. Token Purchase Flow

1. **Owner** deploys `MockUSDT`, `TSaleToken`, and `TokenSaleEscrow`, then transfers 500,000 TSALE into the escrow.
2. **Buyer** calls `MockUSDT.approve(escrowAddress, cost)` to permit the escrow to pull payment.
3. **Buyer** calls `TokenSaleEscrow.buyTokens(amount)`.
4. Escrow validates: amount > 0, inventory sufficient, wallet cap not exceeded, contract not paused.
5. Escrow pulls `cost` mUSDT from the buyer via `safeTransferFrom`.
6. Escrow sends `amount` TSALE to the buyer via `safeTransfer`.
7. `TokensPurchased` event is emitted.

---

## 4. Purchase-Limit Logic

To prevent any single wallet from dominating the sale:

- A `maxPerWallet` value is set at deployment (e.g., 1,000 TSALE).
- A `mapping(address => uint256) public purchased` tracks cumulative buys per wallet.
- On every `buyTokens` call:
  ```solidity
  uint256 newTotal = purchased[msg.sender] + tsaleAmount;
  require(newTotal <= maxPerWallet, "Escrow: exceeds wallet purchase limit");
  purchased[msg.sender] = newTotal;
  ```
- The owner can raise the cap via `setMaxPerWallet(newMax)`.

---

## 5. Rate Calculation (6-Decimal mUSDT ↔ 18-Decimal TSALE)

The `calculateCost` function handles the decimal mismatch between mUSDT (6 decimals) and TSALE (18 decimals):

```solidity
function calculateCost(uint256 tsaleAmount) public view returns (uint256 cost) {
    cost = (tsaleAmount * 10 ** 6) / (rate * 10 ** 18);
}
```

**Example** at `rate = 1` (1 mUSDT per 1 TSALE):
- Buyer wants 10 TSALE → `tsaleAmount = 10 * 10^18 = 10_000_000_000_000_000_000`
- `cost = (10_000_000_000_000_000_000 * 10^6) / (1 * 10^18) = 10_000_000`
- `10_000_000` in mUSDT units (6 decimals) = **10.0 mUSDT** ✅

This formula correctly accounts for the 12-decimal difference so that "1 mUSDT buys 1 TSALE" regardless of their internal decimal representations.

---

## 6. Setup Instructions

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Create a `.env` file from `.env.example`:
```env
PRIVATE_KEY=your_wallet_private_key_without_0x_prefix
BSCSCAN_API_KEY=your_bscscan_api_key
BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.bnbchain.org:8545
```

> **Security:** The `.env` file is listed in `.gitignore` and is **never committed** to the repository. No private keys, seed phrases, or RPC secrets are present in the codebase.

---

## 7. Compilation

```bash
npm run compile
```

---

## 8. Test Commands

```bash
npm test
```

**Test Results: 27 / 27 passing**

```
  TokenSaleEscrow
    Successful purchase
      ✓ transfers TSALE to buyer and mUSDT to escrow
    Purchase without token approval
      ✓ reverts when buyer has not approved the escrow
    Purchase with insufficient allowance
      ✓ reverts when allowance < required cost
    Purchase with insufficient payment-token balance
      ✓ reverts when buyer has no mUSDT
    Purchase while contract is paused
      ✓ reverts buyTokens when paused
      ✓ succeeds after unpausing
    Purchase within wallet limit
      ✓ allows purchase that does not exceed maxPerWallet
    Purchase exceeding wallet limit
      ✓ reverts when a single purchase exceeds maxPerWallet
    Cumulative purchase tracking
      ✓ tracks two partial buys and rejects a third that exceeds the limit
    Owner can update maxPerWallet
      ✓ raises the limit and allows a previously-rejected purchase
    Non-owner cannot update maxPerWallet
      ✓ reverts setMaxPerWallet when called by non-owner
    Non-owner cannot pause or unpause
      ✓ reverts pause() when called by non-owner
      ✓ reverts unpause() when called by non-owner
    Non-owner withdrawal must fail
      ✓ reverts withdrawPayments when called by non-owner
      ✓ reverts withdrawUnsoldTokens when called by non-owner
    Owner payment withdrawal
      ✓ transfers all collected mUSDT to the owner
    Owner unsold-token withdrawal
      ✓ transfers all unsold TSALE to the owner
    Correct balances after purchase
      ✓ reflects accurate mUSDT and TSALE changes for buyer and escrow
    Purchase fails when inventory is insufficient
      ✓ reverts when escrow holds fewer tokens than requested
    Events are emitted correctly
      ✓ emits TokensPurchased with correct args
      ✓ emits PaymentWithdrawn with correct args
      ✓ emits UnsoldTokensWithdrawn with correct args
      ✓ emits RateUpdated when setRate is called
      ✓ emits MaxPerWalletUpdated when setMaxPerWallet is called
    Input validation
      ✓ reverts buyTokens with zero amount
      ✓ reverts withdrawPayments to zero address
      ✓ reverts setRate with zero value

  27 passing (2s)
```

---

## 9. Deployment Commands

```bash
npm run deploy:testnet
npm run verify:testnet
```

---

## 10. Wallet Addresses

| Role | Address |
|---|---|
| **Deployer / Owner** | `0x1E0D642D24Aa3cabb20724710F4DC20Dd03A7A96` |
| **Buyer (interact demo)** | `0x1E0D642D24Aa3cabb20724710F4DC20Dd03A7A96` (same wallet used for demo) |

---

## 11. Contract Addresses (BSC Testnet — Chain ID 97)

| Contract | Address |
|---|---|
| **MockUSDT** | `0x8a1daCe1BBc1dCFf712B016e591FF720F04dd3d0` |
| **TSaleToken** | `0x7A6D605E63608A98E85D5674CaCd33a652102F1e` |
| **TokenSaleEscrow** | `0x0dd07120Bb7fA7eFe93E9Aa21E8588336c869CEe` |

---

## 12. BscScan Verification Links

| Contract | BscScan Link |
|---|---|
| **MockUSDT** | [View verified source](https://testnet.bscscan.com/address/0x8a1daCe1BBc1dCFf712B016e591FF720F04dd3d0#code) |
| **TSaleToken** | [View verified source](https://testnet.bscscan.com/address/0x7A6D605E63608A98E85D5674CaCd33a652102F1e#code) |
| **TokenSaleEscrow** | [View verified source](https://testnet.bscscan.com/address/0x0dd07120Bb7fA7eFe93E9Aa21E8588336c869CEe#code) |

---

## 13. Transaction Hashes

### Deployment Transactions

| Contract | Deployment Tx Hash |
|---|---|
| **MockUSDT** | `0x97019bd5c38e9147385b2354aa8869e86d83425efbdca6fdbd6fe76557668e7a` |
| **TSaleToken** | `0xa68d9507a4df64a245f52298d967396f8bcf7c129536536529615fd64705fc4d` |
| **TokenSaleEscrow** | `0xad9841a947cb250d7fcd380eea964f38cc45a70c7266eb4ad1deda695250a49f` |

### Interaction Transactions (Live on BSC Testnet)

| Action | Transaction Hash | BscScan Link |
|---|---|---|
| **Approval** (mUSDT → Escrow) | `0x96d1a592df7dd10dcb837838e06897536be82d777436fb54d00b01559b44b9f8` | [View](https://testnet.bscscan.com/tx/0x96d1a592df7dd10dcb837838e06897536be82d777436fb54d00b01559b44b9f8) |
| **Purchase** (10 TSALE for 10 mUSDT) | `0xbb23e52f16d51b1c49a3868d7c855881996089baa11a231abbef7af6e31c12b6` | [View](https://testnet.bscscan.com/tx/0xbb23e52f16d51b1c49a3868d7c855881996089baa11a231abbef7af6e31c12b6) |
| **Withdrawal** (owner withdraws mUSDT) | `0xe89e360a6fe6ec17277d314e078f0b5ea86bf7675af37da1a55de178b453b20e` | [View](https://testnet.bscscan.com/tx/0xe89e360a6fe6ec17277d314e078f0b5ea86bf7675af37da1a55de178b453b20e) |

---

## 14. Security Considerations

- **No secrets in repo:** `.env` is in `.gitignore`. Only `.env.example` (with placeholder values) is committed.
- **Pausability:** Owner can halt all purchases instantly via `pause()` in case of emergency.
- **Access Control:** `onlyOwner` on all admin functions (`withdrawPayments`, `withdrawUnsoldTokens`, `setRate`, `setMaxPerWallet`, `pause`, `unpause`).
- **Reentrancy Guard:** `nonReentrant` modifier on `buyTokens`, `withdrawPayments`, and `withdrawUnsoldTokens`.
- **SafeERC20:** All token transfers use OpenZeppelin's `safeTransfer` / `safeTransferFrom` to handle non-standard ERC-20 tokens gracefully.
- **Input Validation:** Zero-amount purchases, zero-address recipients, and zero rate values all revert with descriptive error messages.
- **Decimal Precision:** The rate formula explicitly scales by `10^6 / 10^18` to correctly handle the mUSDT/TSALE decimal mismatch and prevent over/under-pricing.