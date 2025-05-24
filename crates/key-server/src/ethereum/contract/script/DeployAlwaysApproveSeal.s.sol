// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "../src/AlwaysApproveSeal.sol";

contract DeployAlwaysApproveSeal is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy the contract
        AlwaysApproveSeal seal = new AlwaysApproveSeal();
        
        // Log the deployed address
        console.log("AlwaysApproveSeal deployed to:", address(seal));
        
        // Stop broadcasting
        vm.stopBroadcast();
    }
}