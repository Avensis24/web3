// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TSaleToken is ERC20, Ownable {
    constructor(address initialOwner)
        ERC20("Test Sale Token", "TSALE")
        Ownable(initialOwner)
    {
        _mint(initialOwner, 10_000_000 * 10 ** 18);
    }
}
