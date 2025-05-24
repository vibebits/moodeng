import { Buffer } from "buffer";
import { stringToBytes, bytesToHex, concat } from "viem";
import { createPublicClient, createWalletClient, type Address, type Hash } from 'viem';
import { baseSepolia } from 'viem/chains';
import { WHITELIST_CONTRACT_ADDRESS } from "@/utils/constants";

const WHITELIST_ID = "whitelist";
const CONTRACT_ADDRESS = WHITELIST_CONTRACT_ADDRESS as `0x${string}`;

export async function getFullEncryptionId(encryptionId: string) {
  const whitelistIdBytes16 = stringToBytes("whitelist", { size: 16});
  const encryptionIdBytes16 = stringToBytes(encryptionId, { size: 16 });

  // combine encryptionIdBytes16 and whitelistIdBytes16
  const fullIdBytes32Hex = bytesToHex(concat([whitelistIdBytes16, encryptionIdBytes16]));
  
  return fullIdBytes32Hex;  
}

// ABI for the WhitelistSeal contract
export const WHITELIST_SEAL_ABI = [
    {
        "inputs": [{"internalType": "bytes16", "name": "whitelistId", "type": "bytes16"}],
        "name": "createWhitelist",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "bytes16", "name": "whitelistId", "type": "bytes16"},
            {"internalType": "address", "name": "addr", "type": "address"}
        ],
        "name": "addAddress",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "bytes16", "name": "whitelistId", "type": "bytes16"},
            {"internalType": "address", "name": "addr", "type": "address"}
        ],
        "name": "removeAddress",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "bytes16", "name": "whitelistId", "type": "bytes16"},
            {"internalType": "address", "name": "addr", "type": "address"}
        ],
        "name": "isAddressInWhitelist",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "bytes32", "name": "fullId", "type": "bytes32"}],
        "name": "seal_approve",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "nonpayable",
        "type": "function"
    }
] as const;

export async function createWhitelist(
    publicClient: ReturnType<typeof createPublicClient>,
    walletClient: ReturnType<typeof createWalletClient>,
    whitelistId: `0x${string}` // 16 bytes hex string
): Promise<Hash> {
    console.log("(createWhitelist) Creating whitelist with ID:", whitelistId);
    
    try {
        const hash = await walletClient.writeContract({
            address: CONTRACT_ADDRESS,
            abi: WHITELIST_SEAL_ABI,
            functionName: 'createWhitelist',
            args: [whitelistId],
            chain: baseSepolia,
            account: walletClient.account ?? null
        });
        
        console.log("(createWhitelist) Transaction sent:", hash);
        await publicClient.waitForTransactionReceipt({ hash });
        console.log("(createWhitelist) Transaction confirmed");
        return hash;
    } catch (error) {
        console.error("(createWhitelist) Error:", error);
        throw error;
    }
}

export async function addToWhitelist(
    publicClient: ReturnType<typeof createPublicClient>,
    walletClient: ReturnType<typeof createWalletClient>,
    whitelistId: `0x${string}`, // 16 bytes hex string
    addressToAdd: Address // Ethereum address
): Promise<Hash> {
    console.log("(addToWhitelist) Adding address:", addressToAdd, "to whitelist:", whitelistId);
    
    try {
        const hash = await walletClient.writeContract({
            address: CONTRACT_ADDRESS,
            abi: WHITELIST_SEAL_ABI,
            functionName: 'addAddress',
            args: [whitelistId, addressToAdd],
            chain: baseSepolia,
            account: walletClient.account ?? null
        });
        
        console.log("(addToWhitelist) Transaction sent:", hash);
        await publicClient.waitForTransactionReceipt({ hash });
        console.log("(addToWhitelist) Transaction confirmed");
        return hash;
    } catch (error) {
        console.error("(addToWhitelist) Error:", error);
        throw error;
    }
}

export async function removeFromWhitelist(
    publicClient: ReturnType<typeof createPublicClient>,
    walletClient: ReturnType<typeof createWalletClient>,
    whitelistId: `0x${string}`, // 16 bytes hex string
    addressToRemove: Address // Ethereum address
): Promise<Hash> {
    console.log("(removeFromWhitelist) Removing address:", addressToRemove, "from whitelist:", whitelistId);
    
    try {
        const hash = await walletClient.writeContract({
            address: CONTRACT_ADDRESS,
            abi: WHITELIST_SEAL_ABI,
            functionName: 'removeAddress',
            args: [whitelistId, addressToRemove],
            chain: baseSepolia,
            account: walletClient.account ?? null
        });
        
        console.log("(removeFromWhitelist) Transaction sent:", hash);
        await publicClient.waitForTransactionReceipt({ hash });
        console.log("(removeFromWhitelist) Transaction confirmed");
        return hash;
    } catch (error) {
        console.error("(removeFromWhitelist) Error:", error);
        throw error;
    }
}

export async function verifyWhitelist(
    publicClient: ReturnType<typeof createPublicClient>,
    whitelistId: `0x${string}`, // 16 bytes hex string
    addressToVerify: Address // Ethereum address
): Promise<boolean> {
    console.log("(verifyWhitelist) Verifying address:", addressToVerify, "in whitelist:", whitelistId);
    
    try {
        const isWhitelisted = await publicClient.readContract({
            address: CONTRACT_ADDRESS,
            abi: WHITELIST_SEAL_ABI,
            functionName: 'isAddressInWhitelist',
            args: [whitelistId, addressToVerify]
        });
        
        console.log("(verifyWhitelist) Address is", isWhitelisted ? "whitelisted" : "not whitelisted");
        return isWhitelisted;
    } catch (error) {
        console.error("(verifyWhitelist) Error:", error);
        return false;
    }
}

// Function to check if an address is in a whitelist using seal_approve
export async function sealApprove(
    publicClient: ReturnType<typeof createPublicClient>,
    walletClient: ReturnType<typeof createWalletClient>,
    fullId: `0x${string}` // 32 bytes hex string
): Promise<boolean> {
    console.log("(sealApprove) Checking approval for fullId:", fullId);
    
    try {
        const hash = await walletClient.writeContract({
            address: CONTRACT_ADDRESS,
            abi: WHITELIST_SEAL_ABI,
            functionName: 'seal_approve',
            args: [fullId],
            chain: baseSepolia,
            account: walletClient.account ?? null
        });
        
        console.log("(sealApprove) Transaction sent:", hash);
        await publicClient.waitForTransactionReceipt({ hash });
        return true;
    } catch (error) {
        console.error("(sealApprove) Error:", error);
        return false;
    }
}
