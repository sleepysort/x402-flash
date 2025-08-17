// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import {FlashPaymentBroker} from "../src/FlashPaymentBroker.sol";

contract ClientCloseEscrow is Script {
    function run() external {
        address brokerAddr = 0x9904D883Ea8037739C0946caC52C42B38165360a;
        address server = 0xb4bd6078a915b9d71de4Bc857063DB20dd1ad4A3;
        FlashPaymentBroker broker = FlashPaymentBroker(brokerAddr);
        vm.startBroadcast();
        broker.clientCloseEscrow(server);
        vm.stopBroadcast();
    }
}
