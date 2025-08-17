// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ApproveUsdc is Script {
    function run() external {
        address usdc = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
        address spender = 0x9904D883Ea8037739C0946caC52C42B38165360a;
        uint256 value = 100000000000000000;
        IERC20(usdc).approve(spender, value);
    }
}
