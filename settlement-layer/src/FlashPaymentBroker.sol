// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {EscrowAccount} from "./EscrowAccount.sol";

contract FlashPaymentBroker {
    // Mapping of client address to server address to escrow account.
    mapping(address => mapping(address => EscrowAccount)) escrowAccounts;

    function openEscrow(
        address paymentAddress,
        address tokenAddress,
        uint256 amount
    ) external {
        IERC20 token = IERC20(tokenAddress);
        if (token.allowance(msg.sender, address(this)) < amount) {
            revert("Insufficient allowance");
        }
        require(
            address(escrowAccounts[msg.sender][paymentAddress]) != address(0x0),
            "Escrow already exists for this client-server pair"
        );

        escrowAccounts[msg.sender][paymentAddress] = new EscrowAccount(
            msg.sender,
            paymentAddress,
            tokenAddress
        );
        require(
            IERC20(tokenAddress).transferFrom(
                msg.sender,
                address(escrowAccounts[msg.sender][paymentAddress]),
                amount
            ),
            "Token deposit into escrow failed."
        );
    }

    function settlePayment(address paymentAddress, uint256 amount) external {
        EscrowAccount currentEscrowAccount = escrowAccounts[msg.sender][
            paymentAddress
        ];
        require(
            address(currentEscrowAccount) != address(0x0),
            "Escrow does not exist"
        );

        IERC20 token = IERC20(currentEscrowAccount.getEscrowTokenAddress());
        require(
            token.allowance(msg.sender, address(this)) >= amount,
            "Insufficient allowance"
        );

        // TODO: Mentor mentioned transferFrom could possibly error.
        if (!token.transferFrom(msg.sender, paymentAddress, amount)) {
            currentEscrowAccount.compensateServer(amount);
        }
    }

    function getEscrowAccountAddress(
        address client,
        address server
    ) public view returns (address) {
        return address(escrowAccounts[client][server]);
    }
}
