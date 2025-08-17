// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import {FlashPaymentBroker} from "../src/FlashPaymentBroker.sol";

contract OpenEscrow is Script {
    function run() external {
        address brokerAddr = 0x9904D883Ea8037739C0946caC52C42B38165360a;
        address paymentAddress = 0xb4bd6078a915b9d71de4Bc857063DB20dd1ad4A3;
        address tokenAddress = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
        uint256 amount = vm.envUint("TRANSFER_AMOUNT");
        FlashPaymentBroker broker = FlashPaymentBroker(brokerAddr);
        vm.startBroadcast();
        broker.openEscrow(paymentAddress, tokenAddress, amount);
        vm.stopBroadcast();
    }
}
