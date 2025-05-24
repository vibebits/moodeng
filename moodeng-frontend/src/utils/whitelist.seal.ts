
import { Buffer } from "buffer";
import { WHITELIST_CONTRACT_ADDRESS } from "@/utils/constants";
import { encodeFunctionData, parseAbi } from "viem";

// ABI for the starter seal contract
const WHITELIST_SEAL_ABI = parseAbi([
  'function seal_approve(bytes32 id)',
]);

export async function createWhitelistSealTx(
  fullEncryptionId: `0x${string}` // Hex string for the id: Vec<u8> argument
) {
  // Encode the function call data
  const data = encodeFunctionData({
    abi: WHITELIST_SEAL_ABI,
    functionName: 'seal_approve',
    args: [fullEncryptionId],
  });

  return {
    to: WHITELIST_CONTRACT_ADDRESS,
    data,
  };
}
