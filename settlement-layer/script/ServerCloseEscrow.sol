// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import {FlashPaymentBroker} from "../src/FlashPaymentBroker.sol";

contract ServerCloseEscrow is Script {
    function run() external {
        address brokerAddr = 0x9904D883Ea8037739C0946caC52C42B38165360a;
        address client = 0x88aFD4B8000A74044519d83B2F9EDb03d8b9b510;
        FlashPaymentBroker broker = FlashPaymentBroker(brokerAddr);
        vm.startBroadcast();
        broker.serverCloseEscrow(client);
        vm.stopBroadcast();
    }
}
