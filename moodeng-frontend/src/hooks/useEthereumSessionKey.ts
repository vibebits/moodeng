'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { SessionKey } from '@/moodeng-seal-sdk/session-key-ethereum';

// Custom Signer implementation for Ethereum wallet
class EthereumSigner {
  private address: string;
  private signMessage: (params: { message: string }) => Promise<string>;

  constructor(address: string, signMessage: (params: { message: string }) => Promise<string>) {
    this.address = address;
    this.signMessage = signMessage;
  }

  getAddress() {
    return this.address;
  }

  async signPersonalMessage(message: Uint8Array): Promise<{ signature: string }> {
    const signature = await this.signMessage({ message: Buffer.from(message).toString() });

    console.log('signPersonalMessage signature:', signature); // this is the hex string
    console.log('signPersonalMessage mesage:', Buffer.from(message).toString());

    return {
      signature: signature
    };
  }
}

export const useEthereumSessionKey = (contractAddress: string) => {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [sessionKey, setSessionKey] = useState<SessionKey | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clear session key when wallet changes
  useEffect(() => {
    setSessionKey(null);
    setError(null);
  }, [address]);

  useEffect(() => {
    console.log('sessionKey', sessionKey);
  }, [sessionKey]);

  // Generate a new session key
  const generateSessionKey = useCallback(async () => {
    if (!address || !signMessageAsync) {
      setError('Wallet not connected');
      return null;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Create a custom signer for our SessionKey implementation
      const signer = new EthereumSigner(
        address,
        signMessageAsync
      );

      // Create a new session key with the connected wallet
      // Use the Ethereum contract address as the package ID for encryption/decryption
      const newSessionKey = new SessionKey({
        address,
        packageId: contractAddress,
        ttlMin: 15, // 15 minutes TTL
        signer
      });

      // Get certificate to trigger message signing
      await newSessionKey.getCertificate();

      setSessionKey(newSessionKey);
      return newSessionKey;
    } catch (err) {
      console.error('Error generating session key:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate session key');
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [address, signMessageAsync, contractAddress]);

  return {
    sessionKey,
    isGenerating,
    error,
    generateSessionKey
  };
};

export default useEthereumSessionKey; 