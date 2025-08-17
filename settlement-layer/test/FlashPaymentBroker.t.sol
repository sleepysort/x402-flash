// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {FlashPaymentBroker} from "../src/FlashPaymentBroker.sol";
import {EscrowAccount} from "../src/EscrowAccount.sol";

import {ERC20} from "../lib/openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}

contract FlashPaymentBrokerTest is Test {
    FlashPaymentBroker broker;
    MockERC20 token;
    address constant CLIENT_ADDRESS = address(0x1);
    address constant SERVER_ADDRESS = address(0x2);
    uint256 constant INITIAL_TOKEN_BALANCE = 12 ether;
    uint256 constant DEFAULT_APPROVAL_AMOUNT = 1000 ether;

    function setUp() public {
        broker = new FlashPaymentBroker();
        token = new MockERC20("MockToken", "MTK");
        token.mint(CLIENT_ADDRESS, INITIAL_TOKEN_BALANCE);
    }

    function testOpenEscrowCreatesEscrowAndDeposits() public {
        uint256 escrowAmount = 10 ether;

        // client approves broker
        vm.startPrank(CLIENT_ADDRESS);
        token.approve(address(broker), DEFAULT_APPROVAL_AMOUNT);
        // open escrow
        broker.openEscrow(SERVER_ADDRESS, address(token), escrowAmount);
        address escrowAddr = broker.getEscrowAccountAddress(
            CLIENT_ADDRESS,
            SERVER_ADDRESS
        );
        assertTrue(
            escrowAddr != address(0),
            "Escrow account should be created"
        );
        // check escrow token balance
        uint256 escrowBal = token.balanceOf(escrowAddr);
        assertEq(
            escrowBal,
            escrowAmount,
            "Escrow account should hold the deposited amount"
        );
        // check client balance decreased
        uint256 clientBal = token.balanceOf(CLIENT_ADDRESS);
        assertEq(
            clientBal,
            INITIAL_TOKEN_BALANCE - escrowAmount,
            "Client balance should decrease by escrow amount"
        );
        vm.stopPrank();

        assertEq(token.balanceOf(escrowAddr), escrowAmount);
        assertEq(
            EscrowAccount(escrowAddr).getContractOwner(),
            address(broker),
            "Contract owner should be the broker"
        );
    }

    function testSettlePayment_withSufficientFunds_transfersTokensFromClient()
        public
    {
        uint256 escrowAmount = 10 ether;
        uint256 paymentAmount = 1 ether;

        // Setup: client opens escrow with server
        vm.startPrank(CLIENT_ADDRESS);
        token.approve(address(broker), DEFAULT_APPROVAL_AMOUNT);
        broker.openEscrow(SERVER_ADDRESS, address(token), escrowAmount);
        vm.stopPrank();

        // Simulate: client settles payment to server
        uint256 clientBalanceBefore = token.balanceOf(CLIENT_ADDRESS);
        uint256 serverBalanceBefore = token.balanceOf(SERVER_ADDRESS);
        vm.startPrank(CLIENT_ADDRESS);
        // Approve broker to spend escrowAmount again (simulate allowance for settlePayment)
        broker.settlePayment(SERVER_ADDRESS, paymentAmount);
        vm.stopPrank();

        // Assert: server received tokens
        uint256 clientBalanceAfter = token.balanceOf(CLIENT_ADDRESS);
        uint256 serverBalanceAfter = token.balanceOf(SERVER_ADDRESS);

        assertEq(
            clientBalanceAfter,
            clientBalanceBefore - paymentAmount,
            "Client should have paid funds after settlement"
        );

        assertEq(
            serverBalanceAfter,
            serverBalanceBefore + paymentAmount,
            "Server should receive payment after settlement"
        );

        address escrowAddr = broker.getEscrowAccountAddress(
            CLIENT_ADDRESS,
            SERVER_ADDRESS
        );
        uint256 escrowBal = token.balanceOf(escrowAddr);
        assertEq(
            escrowBal,
            escrowAmount,
            "Escrow account should not be affected by settlement"
        );
    }

    function testSettlePayment_insufficientFunds_withdrawsFromEscrow() public {
        uint256 escrowAmount = 10 ether;
        uint256 paymentAmount = 3 ether;

        // Setup: client opens escrow with server
        vm.startPrank(CLIENT_ADDRESS);
        token.approve(address(broker), DEFAULT_APPROVAL_AMOUNT);
        broker.openEscrow(SERVER_ADDRESS, address(token), escrowAmount);
        vm.stopPrank();

        // Simulate: client settles payment to server
        uint256 clientBalanceBefore = token.balanceOf(CLIENT_ADDRESS);
        uint256 serverBalanceBefore = token.balanceOf(SERVER_ADDRESS);
        vm.startPrank(CLIENT_ADDRESS);
        // Approve broker to spend escrowAmount again (simulate allowance for settlePayment)
        broker.settlePayment(SERVER_ADDRESS, paymentAmount);
        vm.stopPrank();

        // Assert: server received tokens
        uint256 clientBalanceAfter = token.balanceOf(CLIENT_ADDRESS);
        uint256 serverBalanceAfter = token.balanceOf(SERVER_ADDRESS);

        assertEq(
            clientBalanceAfter,
            clientBalanceBefore,
            "Client should have not have funds withdrawn from balance"
        );

        assertEq(
            serverBalanceAfter,
            serverBalanceBefore + paymentAmount,
            "Server should receive payment after settlement"
        );

        address escrowAddr = broker.getEscrowAccountAddress(
            CLIENT_ADDRESS,
            SERVER_ADDRESS
        );
        uint256 escrowBal = token.balanceOf(escrowAddr);
        assertEq(
            escrowBal,
            escrowAmount - paymentAmount,
            "Escrow account should have paid out the payment amount"
        );
    }

    function testEscrowClosesWhenBothClientAndServerAgree() public {
        uint256 escrowAmount = 5 ether;
        vm.startPrank(CLIENT_ADDRESS);
        token.approve(address(broker), DEFAULT_APPROVAL_AMOUNT);
        broker.openEscrow(SERVER_ADDRESS, address(token), escrowAmount);
        vm.stopPrank();
        address escrowAddr = broker.getEscrowAccountAddress(
            CLIENT_ADDRESS,
            SERVER_ADDRESS
        );

        // Both client and server close escrow
        vm.startPrank(CLIENT_ADDRESS);
        broker.clientCloseEscrow(SERVER_ADDRESS);
        vm.stopPrank();

        vm.startPrank(SERVER_ADDRESS);
        broker.serverCloseEscrow(CLIENT_ADDRESS);
        vm.stopPrank();

        // Escrow account should be emptied and funds returned to client
        uint256 escrowBal = token.balanceOf(escrowAddr);
        assertEq(
            escrowBal,
            0,
            "Escrow account should be empty after both close"
        );
        uint256 clientBal = token.balanceOf(CLIENT_ADDRESS);
        assertEq(
            clientBal,
            INITIAL_TOKEN_BALANCE,
            "Client should get funds back after both close"
        );
    }

    function testEscrowNotClosedIfOnlyClientCloses() public {
        uint256 escrowAmount = 5 ether;
        // Inline _openEscrow logic
        vm.startPrank(CLIENT_ADDRESS);
        token.approve(address(broker), DEFAULT_APPROVAL_AMOUNT);
        broker.openEscrow(SERVER_ADDRESS, address(token), escrowAmount);
        vm.stopPrank();
        address escrowAddr = broker.getEscrowAccountAddress(
            CLIENT_ADDRESS,
            SERVER_ADDRESS
        );

        // Only client closes
        vm.startPrank(CLIENT_ADDRESS);
        broker.clientCloseEscrow(SERVER_ADDRESS);
        vm.stopPrank();

        // Escrow account should still have funds
        uint256 escrowBal = token.balanceOf(escrowAddr);
        assertEq(
            escrowBal,
            escrowAmount,
            "Escrow should not close if only client closes"
        );
    }

    function testEscrowNotClosedIfOnlyServerCloses() public {
        uint256 escrowAmount = 5 ether;
        // Inline _openEscrow logic
        vm.startPrank(CLIENT_ADDRESS);
        token.approve(address(broker), DEFAULT_APPROVAL_AMOUNT);
        broker.openEscrow(SERVER_ADDRESS, address(token), escrowAmount);
        vm.stopPrank();
        address escrowAddr = broker.getEscrowAccountAddress(
            CLIENT_ADDRESS,
            SERVER_ADDRESS
        );

        // Only server closes
        vm.startPrank(SERVER_ADDRESS);
        broker.serverCloseEscrow(CLIENT_ADDRESS);
        vm.stopPrank();

        // Escrow account should still have funds
        uint256 escrowBal = token.balanceOf(escrowAddr);
        assertEq(
            escrowBal,
            escrowAmount,
            "Escrow should not close if only server closes"
        );
    }
}
