import { Buffer } from "buffer";
import { STARTER_CONTRACT_ADDRESS } from "@/utils/constants";
import { encodeFunctionData, parseAbi } from 'viem';

// ABI for the starter seal contract
const STARTER_SEAL_ABI = parseAbi([
  'function seal_approve(bytes32 id)',
]);

// ethereum - createStarterSealTx
export async function createStarterSealTx({
  fullEncryptionId
}: {
  fullEncryptionId: `0x${string}`;
}) {
  // Encode the function call data
  const data = encodeFunctionData({
    abi: STARTER_SEAL_ABI,
    functionName: 'seal_approve',
    args: [fullEncryptionId],
  });

  return {
    to: STARTER_CONTRACT_ADDRESS,
    data,
  };
}
