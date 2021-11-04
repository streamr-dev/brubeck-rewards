//SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Distributor {
    IERC20 public token;

    address public owner;
    uint public stipend = 0.01 ether; // estimate from https://polygonscan.com/tokentxns

    constructor(address _token) {
        token = IERC20(_token);
        owner = msg.sender;
    }
    receive() external payable {}

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
            payable(recipient).transfer(stipend);
        }
    }

    function withdrawAll() onlyOwner public {
        token.transfer(owner, token.balanceOf(address(this)));
    }

    function setStipend(uint newStipendWei) onlyOwner public {
        stipend = newStipendWei;
    }
}
