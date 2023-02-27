// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract LINK is ERC20 {
    constructor() ERC20("Chainlink Token", "LINK") {
        _mint(msg.sender, 10**27); // mint 1 billion tokens with 18 decimal places
    }
}
