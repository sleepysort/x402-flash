// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {EscrowAccount} from "./EscrowAccount.sol";

contract FlashPaymentBroker {
    // Mapping of client address to server address to escrow account.
    mapping(address => mapping(address => EscrowAccount)) public escrowAccounts;

    /**
     * Opens an escrow account for a client-server pair. This escrow account is used to
     * insure that the server gets paid for the service provided.
     *
     * @param paymentAddress The address of the server to which the payment is made.
     * @param tokenAddress The address of the ERC20 token used for payment.
     * @param amount The amount of tokens to be deposited into the escrow account.
     */
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
            address(escrowAccounts[msg.sender][paymentAddress]) == address(0x0),
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

    /**
     * Proxies the token transfer from the client to the server. In the case that the transfer fails,
     * the server is compensated from the escrow account.
     *
     * @param paymentAddress The address of the server to which the payment is made.
     * @param amount The amount of tokens to be transferred.
     */
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

        // TODO: Mentor mentioned transferFrom could possibly error
        try token.transferFrom(msg.sender, paymentAddress, amount) returns (
            bool success
        ) {
            if (!success) {
                currentEscrowAccount.compensateServer(amount);
            }
        } catch {
            currentEscrowAccount.compensateServer(amount);
        }
    }

    function getEscrowAccountAddress(
        address client,
        address server
    ) public view returns (address) {
        return address(escrowAccounts[client][server]);
    }

    function getEscrowTokenBalance(
        address client,
        address server
    ) public view returns (uint256) {
        return escrowAccounts[client][server].getEscrowTokenBalance();
    }

    function getEscrowTokenAddress(
        address client,
        address server
    ) public view returns (address) {
        return escrowAccounts[client][server].getEscrowTokenAddress();
    }

    /**
     * Initiates the closure of the escrow account from the client's side. If the server
     * has also closed the escrow, the remaining balance is returned to the client.
     *
     * @param server The server address that the client wants to close the escrow with.
     */
    function clientCloseEscrow(address server) public {
        EscrowAccount currentEscrowAccount = escrowAccounts[msg.sender][server];
        require(
            address(currentEscrowAccount) != address(0x0),
            "Escrow does not exist"
        );
        currentEscrowAccount.clientCloseEscrow();
    }

    /**
     * Initiates the closure of the escrow account from the server's side. If the client
     * has also closed the escrow, the remaining balance is returned to the client.
     *
     * @param client The client address that the server wants to close the escrow with.
     */
    function serverCloseEscrow(address client) public {
        EscrowAccount currentEscrowAccount = escrowAccounts[client][msg.sender];
        require(
            address(currentEscrowAccount) != address(0x0),
            "Escrow does not exist"
        );
        currentEscrowAccount.serverCloseEscrow();
    }
}
