// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract WhitelistSeal {
    struct Whitelist {
        address owner;
        mapping(address => bool) addresses;
        uint256 addressCount;
    }
    
    // Mapping from whitelist ID to Whitelist struct
    mapping(bytes16 => Whitelist) public whitelists;
    
    // Events
    event WhitelistCreated(bytes16 indexed whitelistId, address indexed owner);
    event AddressAdded(bytes16 indexed whitelistId, address indexed addr);
    event AddressRemoved(bytes16 indexed whitelistId, address indexed addr);
    event WhitelistChecked(bytes16 indexed whitelistId, address indexed addr, bool success);
    
    // Function to create a new whitelist
    function createWhitelist(bytes16 whitelistId) external {
        require(whitelists[whitelistId].owner == address(0), "Whitelist already exists");
        whitelists[whitelistId].owner = msg.sender;
        emit WhitelistCreated(whitelistId, msg.sender);
    }
    
    // Function to add an address to a whitelist
    function addAddress(bytes16 whitelistId, address addr) external {
        require(whitelists[whitelistId].owner == msg.sender, "Not whitelist owner");
        require(!whitelists[whitelistId].addresses[addr], "Address already in whitelist");
        whitelists[whitelistId].addresses[addr] = true;
        whitelists[whitelistId].addressCount++;
        emit AddressAdded(whitelistId, addr);
    }
    
    // Function to remove an address from a whitelist
    function removeAddress(bytes16 whitelistId, address addr) external {
        require(whitelists[whitelistId].owner == msg.sender, "Not whitelist owner");
        require(whitelists[whitelistId].addresses[addr], "Address not in whitelist");
        whitelists[whitelistId].addresses[addr] = false;
        whitelists[whitelistId].addressCount--;
        emit AddressRemoved(whitelistId, addr);
    }
    
    // Function to check if an address is in a whitelist
    function isAddressInWhitelist(bytes16 whitelistId, address addr) external view returns (bool) {
        return whitelists[whitelistId].addresses[addr];
    }
    
    // Function to get whitelist owner
    function getWhitelistOwner(bytes16 whitelistId) external view returns (address) {
        return whitelists[whitelistId].owner;
    }
    
    // Function to get whitelist address count
    function getWhitelistAddressCount(bytes16 whitelistId) external view returns (uint256) {
        return whitelists[whitelistId].addressCount;
    }
    
    // Function to check if an address is in a whitelist
    function seal_approve(bytes32 fullId) external returns (bool) {
        // fullId = 16 bytes whitelistId + 16 bytes encryptionId

        // get whitelistId
        bytes16 whitelistId = bytes16(fullId);

        // check user is in whitelist (msg.sender is the signer of sessionKey)
        bool success = whitelists[whitelistId].addresses[msg.sender];

        emit WhitelistChecked(whitelistId, msg.sender, success);
        return success;
    }
} 