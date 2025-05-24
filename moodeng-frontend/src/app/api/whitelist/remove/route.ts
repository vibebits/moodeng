import { NextResponse } from 'next/server';
import { removeFromWhitelist } from '@/utils/whitelist';
import { createPublicClient, createWalletClient, http, stringToBytes, bytesToHex, type PublicClient, type WalletClient } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const PRIVATE_KEY = process.env.AUTHORITY_PRIVATE_KEY as `0x${string}`;
const WHITELIST_ID = "whitelist";

export async function POST(request: Request) {
  try {
    const { address } = await request.json();
    
    if (!address) {
      return NextResponse.json(
        { error: 'Missing address parameter' },
        { status: 400 }
      );
    }

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

    console.log("whitelistIdHex:", whitelistIdHex, address);

    const txHash = await removeFromWhitelist(
      publicClient,
      walletClient,
      whitelistIdHex as `0x${string}`,
      address as `0x${string}`
    );
    
    return NextResponse.json({ 
      success: true,
      txHash 
    });
  } catch (error) {
    console.error('Error in remove from whitelist endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to remove from whitelist' },
      { status: 500 }
    );
  }
} 