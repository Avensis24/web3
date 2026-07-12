// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockUSDT is ERC20, Ownable {
    constructor(address initialOwner)
        ERC20("Mock USDT", "mUSDT")
        Ownable(initialOwner)
    {
        _mint(initialOwner, 1_000_000 * 10 ** 6);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "MockUSDT: mint to the zero address");
        require(amount > 0, "MockUSDT: amount must be positive");
        _mint(to, amount);
    }
}