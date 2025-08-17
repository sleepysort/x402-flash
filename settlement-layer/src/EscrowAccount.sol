// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract EscrowAccount {
    address immutable contractOwner;
    address immutable clientOwner;
    address immutable serverOwner;
    IERC20 immutable token;

    bool clientClosed;
    bool serverClosed;

    constructor(
        address clientOwner_,
        address serverOwner_,
        address tokenAddress_
    ) {
        contractOwner = msg.sender;
        clientOwner = clientOwner_;
        serverOwner = serverOwner_;
        token = IERC20(tokenAddress_);
        clientClosed = false;
        serverClosed = false;
    }

    function compensateServer(uint256 amount) public onlyContractOwner {
        require(
            token.balanceOf(address(this)) >= amount,
            "Insufficient balance in escrow"
        );
        require(token.transfer(serverOwner, amount), "Token transfer failed");
    }

    function getContractOwner() public view returns (address) {
        return contractOwner;
    }

    function getEscrowTokenBalance() public view returns (uint256) {
        return token.balanceOf(address(this));
    }

    function getEscrowTokenAddress() public view returns (address) {
        return address(token);
    }

    function clientCloseEscrow() public onlyContractOwner {
        clientClosed = true;
        restoreRemainingIfClosed();
    }

    function serverCloseEscrow() public onlyContractOwner {
        serverClosed = true;
        restoreRemainingIfClosed();
    }

    function restoreRemainingIfClosed() private {
        if (clientClosed && serverClosed) {
            token.transfer(clientOwner, token.balanceOf(address(this)));
        }
    }

    modifier onlyContractOwner() {
        require(
            msg.sender == contractOwner,
            "Only contract owner can call this function"
        );
        _;
    }
}
