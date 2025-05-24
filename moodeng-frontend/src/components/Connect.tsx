'use client'

import { useAccount, useDisconnect, useSwitchChain } from "wagmi";
import { useEffect, useState } from "react";
import { modal } from "@/contexts/WalletContextProvider";
import dynamic from 'next/dynamic';
import { baseSepolia } from "@reown/appkit/networks";

export default function ConnectComponent() {
  const { address, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isSwitchingChain, setIsSwitchingChain] = useState(false);

  const expectedChainId = baseSepolia.id;

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      await modal.open();
    } catch (error) {
      console.error("Failed to connect:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsDisconnecting(true);
      await disconnect();
    } catch (error) {
      console.error("Failed to disconnect:", error);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleSwitchChain = async () => {
    try {
      setIsSwitchingChain(true);
      await switchChain({ chainId: expectedChainId });
    } catch (error) {
      console.error("Failed to switch chain:", error);
    } finally {
      setIsSwitchingChain(false);
    }
  };

  useEffect(() => {
    if (isConnected) {
      console.log("connected to", chain?.name);
    }
  }, [isConnected, chain]);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (isConnected) {
        disconnect();
      }
    };
  }, [isConnected, disconnect]);

  const isOnExpectedChain = chain?.id === expectedChainId;

  return (
    <div className="flex flex-col items-center gap-4 mb-2">
      {!isConnected ? (
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isConnecting ? "Connecting..." : "Connect Wallet"}
        </button>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <div className="text-sm font-mono text-gray-600">
            Connected: {address?.slice(0, 6)}...{address?.slice(-4)} on {chain?.name || "Unknown Network"}
          </div>
          {!isOnExpectedChain && (
            <button
              onClick={handleSwitchChain}
              disabled={isSwitchingChain}
              className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSwitchingChain ? "Switching..." : `Switch to ${baseSepolia.name}`}
            </button>
          )}
          <button
            onClick={handleDisconnect}
            disabled={isDisconnecting}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDisconnecting ? "Disconnecting..." : "Disconnect"}
          </button>
        </div>
      )}
    </div>
  );
}

// Disable SSR for the Connect component
export const Connect = dynamic(() => Promise.resolve(ConnectComponent), {
  ssr: false
}); 