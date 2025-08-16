// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract EscrowAccount {
    address clientOwner;
    address serverOwner;
    IERC20 token;

    bool clientClosed;
    bool serverClosed;

    constructor(
        address clientOwner_,
        address serverOwner_,
        address tokenAddress_
    ) {
        clientOwner = clientOwner_;
        serverOwner = serverOwner_;
        token = IERC20(tokenAddress_);
        clientClosed = false;
        serverClosed = false;
    }

    function compensateServer(uint256 amount) public onlyClientOwner {
        require(
            token.balanceOf(address(this)) >= amount,
            "Insufficient balance in escrow"
        );
        require(
            token.transferFrom(address(this), serverOwner, amount),
            "Token transfer failed"
        );
    }

    function getEscrowTokenBalance() public view returns (uint256) {
        return token.balanceOf(address(this));
    }

    function getEscrowTokenAddress() public view returns (address) {
        return address(token);
    }

    function clientCloseEscrow() public onlyClientOwner {
        clientClosed = true;
        restoreRemainingIfClosed();
    }

    function serverCloseEscrow() public onlyServerOwner {
        serverClosed = true;
        restoreRemainingIfClosed();
    }

    function restoreRemainingIfClosed() private {
        if (clientClosed && serverClosed) {
            token.transfer(clientOwner, token.balanceOf(address(this)));
        }
    }

    modifier onlyClientOwner() {
        require(
            msg.sender == clientOwner,
            "Only client owner can call this function"
        );
        _;
    }

    modifier onlyServerOwner() {
        require(
            msg.sender == serverOwner,
            "Only server owner can call this function"
        );
        _;
    }
}
