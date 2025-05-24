// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "../src/AlwaysApproveSeal.sol";

contract VerifyAlwaysApproveSeal is Script {
    function run() public {
        // The address of the deployed contract
        address deployedAddress = 0x732687B7f42aa6d73143d74548BbcD84BceDB149;
        
        // Verify the contract
        vm.startBroadcast();
        // No need to deploy, just verify
        vm.stopBroadcast();
    }
} 