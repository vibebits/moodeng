// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../src/AlwaysApproveSeal.sol";

contract AlwaysApproveSealTest is Test {
    AlwaysApproveSeal seal;

    function setUp() public {
        seal = new AlwaysApproveSeal();
    }

    function testSealApprove() public {
        // Create a bytes32 with the pattern we want to test
        bytes32 testPayload = bytes32(abi.encodePacked(bytes1(0x01), bytes1(0x02), bytes1(0x03), bytes29(0)));
        
        // Call seal_approve with the test payload
        bool success = seal.seal_approve(testPayload);
        
        // Assert that the call was successful
        assertTrue(success, "seal_approve should return true for valid pattern");
    }

    function testSealApproveInvalid() public {
        // Create a bytes32 with an invalid pattern
        bytes32 testPayload = bytes32(abi.encodePacked(bytes1(0x01), bytes1(0x02), bytes1(0x04), bytes29(0)));
        
        // Call seal_approve with the invalid payload
        bool success = seal.seal_approve(testPayload);
        
        // Assert that the call was not successful
        assertFalse(success, "seal_approve should return false for invalid pattern");
    }
}