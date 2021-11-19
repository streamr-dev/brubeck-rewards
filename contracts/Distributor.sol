//SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Distributor is Ownable {
    IERC20 public token;

    uint public stipend = 0.01 ether; // estimate from https://polygonscan.com/tokentxns

    constructor(address _token) Ownable() {
        token = IERC20(_token);
    }
    receive() external payable {}

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
        token.transfer(owner(), token.balanceOf(address(this)));
        payable(owner()).transfer(address(this).balance);
    }

    function setStipend(uint newStipendWei) onlyOwner public {
        stipend = newStipendWei;
    }
}
