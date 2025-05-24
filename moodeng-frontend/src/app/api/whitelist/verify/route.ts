import { NextResponse } from 'next/server';
import { verifyWhitelist } from '@/utils/whitelist';
import { bytesToHex, createPublicClient, http, stringToBytes, type PublicClient } from 'viem';
import { baseSepolia } from 'viem/chains';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const whitelist = searchParams.get('whitelist');
    const address = searchParams.get('address');

    console.log('Params:', { whitelist, address });

    if (!whitelist || !address) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const whitelistIdBytes16 = stringToBytes(whitelist, { size: 16 });
    const whitelistIdHex = bytesToHex(whitelistIdBytes16);

    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http()
    }) as PublicClient;

    console.log("whitelistIdHex:", whitelistIdHex, address);

    const isWhitelisted = await verifyWhitelist(
      publicClient,
      whitelistIdHex as `0x${string}`,
      address as `0x${string}`
    );

    console.log(`/api/whitelist/verify - isWhitelisted: ${isWhitelisted}`);

    const response = NextResponse.json({ isWhitelisted });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  } catch (error) {
    console.error('Error in verify endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to verify whitelist' },
      { status: 500 }
    );
  }
}
