// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "../src/WhitelistSeal.sol";

contract DeployScript is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        WhitelistSeal whitelistSeal = new WhitelistSeal();
        
        vm.stopBroadcast();
        
        console2.log("WhitelistSeal deployed to:", address(whitelistSeal));
    }
} 