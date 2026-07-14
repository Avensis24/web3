// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract TokenSaleEscrow is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable paymentToken;
    IERC20 public immutable saleToken;

    uint256 public rate;
    uint256 public maxPerWallet;
    uint256 public minPurchase;

    mapping(address => uint256) public purchased;

    event TokensPurchased(address indexed buyer, uint256 tsaleAmount, uint256 paymentAmount);
    event PaymentWithdrawn(address indexed to, uint256 amount);
    event UnsoldTokensWithdrawn(address indexed to, uint256 amount);
    event RateUpdated(uint256 oldRate, uint256 newRate);
    event MaxPerWalletUpdated(uint256 oldMax, uint256 newMax);
    event MinPurchaseUpdated(uint256 oldMin, uint256 newMin);

    constructor(
        address _paymentToken,
        address _saleToken,
        uint256 _rate,
        uint256 _maxPerWallet,
        uint256 _minPurchase
    ) Ownable(msg.sender) {
        require(_paymentToken != address(0), "Escrow: zero payment token address");
        require(_saleToken != address(0), "Escrow: zero sale token address");
        require(_rate > 0, "Escrow: rate must be positive");
        require(_maxPerWallet > 0, "Escrow: max per wallet must be positive");
        require(_minPurchase > 0, "Escrow: min purchase must be positive");

        paymentToken = IERC20(_paymentToken);
        saleToken = IERC20(_saleToken);
        rate = _rate;
        maxPerWallet = _maxPerWallet;
        minPurchase = _minPurchase;
    }

    function calculateCost(uint256 tsaleAmount) public view returns (uint256 cost) {
        cost = (tsaleAmount * 10 ** 6) / (rate * 10 ** 18);
    }

    function inventoryBalance() external view returns (uint256) {
        return saleToken.balanceOf(address(this));
    }

    function paymentBalance() external view returns (uint256) {
        return paymentToken.balanceOf(address(this));
    }

    function buyTokens(uint256 tsaleAmount) external nonReentrant whenNotPaused {
        require(tsaleAmount > 0, "Escrow: amount must be positive");
        require(tsaleAmount >= minPurchase, "Escrow: below minimum purchase");

        uint256 cost = calculateCost(tsaleAmount);
        require(cost > 0, "Escrow: payment amount too small");

        uint256 inventory = saleToken.balanceOf(address(this));
        require(inventory >= tsaleAmount, "Escrow: insufficient token inventory");

        uint256 newTotal = purchased[msg.sender] + tsaleAmount;
        require(newTotal <= maxPerWallet, "Escrow: exceeds wallet purchase limit");

        purchased[msg.sender] = newTotal;

        paymentToken.safeTransferFrom(msg.sender, address(this), cost);
        saleToken.safeTransfer(msg.sender, tsaleAmount);

        emit TokensPurchased(msg.sender, tsaleAmount, cost);
    }

    function withdrawPayments(address to) external onlyOwner nonReentrant {
        require(to != address(0), "Escrow: zero recipient address");

        uint256 balance = paymentToken.balanceOf(address(this));
        require(balance > 0, "Escrow: no payments to withdraw");

        paymentToken.safeTransfer(to, balance);
        emit PaymentWithdrawn(to, balance);
    }

    function withdrawUnsoldTokens(address to) external onlyOwner nonReentrant {
        require(to != address(0), "Escrow: zero recipient address");

        uint256 balance = saleToken.balanceOf(address(this));
        require(balance > 0, "Escrow: no tokens to withdraw");

        saleToken.safeTransfer(to, balance);
        emit UnsoldTokensWithdrawn(to, balance);
    }

    function setRate(uint256 newRate) external onlyOwner {
        require(newRate > 0, "Escrow: rate must be positive");
        uint256 oldRate = rate;
        rate = newRate;
        emit RateUpdated(oldRate, newRate);
    }

    function setMaxPerWallet(uint256 newMax) external onlyOwner {
        require(newMax > 0, "Escrow: max must be positive");
        uint256 oldMax = maxPerWallet;
        maxPerWallet = newMax;
        emit MaxPerWalletUpdated(oldMax, newMax);
    }

    function setMinPurchase(uint256 newMin) external onlyOwner {
        require(newMin > 0, "Escrow: min must be positive");
        uint256 oldMin = minPurchase;
        minPurchase = newMin;
        emit MinPurchaseUpdated(oldMin, newMin);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
