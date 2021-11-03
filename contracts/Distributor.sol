//SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Distributor {
    IERC20 public token;

    address public owner;

    constructor(address _token) {
        token = IERC20(_token);
        owner = msg.sender;
    }

    modifier onlyOwner {
        require(msg.sender == owner, "error_onlyOwner");
        _;
    }

    function send(address[] calldata recipients, uint[] calldata amounts) external {
        require(recipients.length == amounts.length);
        for (uint i = 0; i < recipients.length; i++) {
            address recipient = recipients[i];
            uint amount = amounts[i];
            require(token.transfer(recipient, amount), "error_transfer");
        }
    }

    function withdrawAll() onlyOwner public {
        token.transfer(owner, token.balanceOf(address(this)));
    }
}
