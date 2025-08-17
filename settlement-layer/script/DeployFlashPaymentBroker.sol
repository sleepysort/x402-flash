// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {FlashPaymentBroker} from "../src/FlashPaymentBroker.sol";

contract DeployFlashPaymentBroker is Script {
    FlashPaymentBroker public broker;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        broker = new FlashPaymentBroker();

        vm.stopBroadcast();
    }
}
