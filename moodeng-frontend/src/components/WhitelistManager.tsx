'use client';

import { useState, useEffect } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { parseEther } from "viem";
import { WHITELIST_SEAL_ABI } from "@/utils/whitelist";

interface WhitelistManagerProps {
  whitelistStatus: boolean | null;
  setWhitelistStatus: (status: boolean | null) => void;
  contractAddress: string;
}

export default function WhitelistManager({ 
  whitelistStatus, 
  setWhitelistStatus,
  contractAddress 
}: WhitelistManagerProps) {
  const { address, isConnected } = useAccount();
  const [isAdding, setIsAdding] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verifyWhitelist = async () => {
    const response = await fetch(`/api/whitelist/verify?whitelist=whitelist&address=${address}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error('Failed to verify whitelist');  
    }
    const data = await response.json();
    setWhitelistStatus(data.isWhitelisted);
  };

  // onload verify whitelist status by calling the verify endpoint
  useEffect(() => {
    if (address) {
      verifyWhitelist();
    }
  }, [address]);

  const handleAddToWhitelist = async () => {
    if (!address || !isConnected) {
      setError("Please connect your wallet first");
      return;
    }

    setIsAdding(true);
    setError(null);

    try {
      const response = await fetch('/api/whitelist/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address }),
      });

      if (!response.ok) {
        throw new Error('Failed to add to whitelist');
      }

      const data = await response.json();
      console.log("Add transaction hash:", data.txHash);
    } catch (err) {
      console.error("Error adding to whitelist:", err);
      setError("Failed to add to whitelist");
    } finally {
      setIsAdding(false);
      verifyWhitelist();
    }
  };

  const handleRemoveFromWhitelist = async () => {
    if (!address || !isConnected) {
      setError("Please connect your wallet first");
      return;
    }

    setIsRemoving(true);
    setError(null);

    try {
      const response = await fetch('/api/whitelist/remove', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove from whitelist');
      }

      const data = await response.json();
      console.log("Remove transaction hash:", data.txHash);
    } catch (err) {
      console.error("Error removing from whitelist:", err);
      setError("Failed to remove from whitelist");
    } finally {
      setIsRemoving(false);
      verifyWhitelist();
    }
  };

  return (
    <div className="border p-4 rounded-md">
      <h2 className="text-lg font-medium text-gray-900 mb-4">
        Am I whitelisted?
      </h2>
      <div className="flex flex-col items-center justify-center mb-4">
        <p className="" style={{ fontSize: "3rem" }}>
          {whitelistStatus === null
            ? "🤔"
            : whitelistStatus
            ? "😎"
            : "😭"}
        </p>
      </div>

      <div className="flex gap-4">
        <button
          onClick={handleAddToWhitelist}
          disabled={!isConnected || isAdding || whitelistStatus === true}
          className={`flex-1 py-1 px-4 rounded-md ${
            !isConnected || isAdding || whitelistStatus === true
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-purple-600 hover:bg-purple-700 text-white"
          }`}
        >
          {isAdding ? "Adding..." : "Add Me!"}
        </button>
        <button
          onClick={handleRemoveFromWhitelist}
          disabled={!isConnected || isRemoving || whitelistStatus === false}
          className={`flex-1 py-1 px-4 rounded-md ${
            !isConnected || isRemoving || whitelistStatus === false
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-red-600 hover:bg-red-700 text-white"
          }`}
        >
          {isRemoving ? "Removing..." : "Remove Me!"}
        </button>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
 