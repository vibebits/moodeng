// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract AlwaysApproveSeal {
    // Event to log the policy ID and result
    event PolicyChecked(bytes32 indexed id, bool success);

    // Function that returns true if the policy ID matches the pattern
    function seal_approve(bytes32 id) external returns (bool) {
        // Convert bytes32 to bytes for easier manipulation
        bytes memory idBytes = abi.encodePacked(id);

        bytes3 prefix = "123";
        
        // Check first 3 bytes
        // if 1, 2 and 3, return true (means approve)
        bool success;
        if(
            idBytes[0] == prefix[0] && 
            idBytes[1] == prefix[1] && 
            idBytes[2] == prefix[2]
        ) {
            success = true;
        } else {
            success = false;
        }

        // Log the id and success value
        emit PolicyChecked(id, success);

        return success;
    }
}