// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "../src/AlwaysApproveSeal.sol";

contract DeployAlwaysApproveSeal is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        AlwaysApproveSeal seal = new AlwaysApproveSeal();

        vm.stopBroadcast();
    }
} 