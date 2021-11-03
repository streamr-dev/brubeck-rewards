// SPDX-License-Identifier: MIT

pragma solidity 0.8.6;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * Mintable TestToken for contract tests
 * Transfers of 666 are rejected with return value false
 */
contract TestToken is ERC20 {
    constructor (string memory name, string memory symbol) ERC20(name, symbol) {
        // solhint-disable-previous-line no-empty-blocks
    }

    /**
     * Token contract owner can create tokens
     * @param recipient address where new tokens are transferred (from 0x0)
     * @param amount scaled so that 10^18 equals 1 token (multiply by 10^18)
     */
    function mint(address recipient, uint amount) external {
        _mint(recipient, amount);
    }
}
