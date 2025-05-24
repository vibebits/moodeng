import { NextResponse } from 'next/server';
import { createWhitelist } from '@/utils/whitelist';
import { createPublicClient, createWalletClient, http, stringToBytes, bytesToHex, type PublicClient, type WalletClient } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const PRIVATE_KEY = process.env.AUTHORITY_PRIVATE_KEY as `0x${string}`;
const WHITELIST_ID = "whitelist";

export async function GET(request: Request) {
  try {
    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http()
    }) as PublicClient;

    const account = privateKeyToAccount(PRIVATE_KEY);
    const walletClient = createWalletClient({
      account,
      chain: baseSepolia,
      transport: http()
    }) as WalletClient;

    const whitelistIdBytes16 = stringToBytes(WHITELIST_ID, { size: 16 });
    const whitelistIdHex = bytesToHex(whitelistIdBytes16);

    const txHash = await createWhitelist(
      publicClient,
      walletClient,
      whitelistIdHex as `0x${string}`
    );

    return NextResponse.json({ txHash });
  } catch (error) {
    console.error('Error creating whitelist:', error);
    return NextResponse.json(
      { error: 'Failed to create whitelist' },
      { status: 500 }
    );
  }
} 