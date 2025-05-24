"use client";

import { useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

import useEthereumSessionKey from "@/hooks/useEthereumSessionKey";
import { useEthereumSealClient } from "@/hooks/useEthereumSealClient";
import { STARTER_CONTRACT_ADDRESS } from "@/utils/constants";
import { TextEncryptDecrypt } from "@/components/TextEncryptDecrypt";
import { ImageEncryptDecrypt } from "@/components/ImageEncryptDecrypt";
import { SessionKeySection } from "@/components/SessionKeySection";
import { Connect } from "@/components/Connect";
import Footer from "@/components/Footer";

export default function Home() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const [encryptionMode, setEncryptionMode] = useState<"text" | "image">("text");
  
  const {
    sessionKey,
    isGenerating,
    error: sessionKeyError,
    generateSessionKey,
  } = useEthereumSessionKey(STARTER_CONTRACT_ADDRESS);

  const ethereumSealClient = useEthereumSealClient();

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="flex flex-col items-center justify-center w-full max-w-3xl gap-8">
        <h1 className="text-4xl font-bold text-center mt-8">
          Ethereum Seal Starter Demo
        </h1>

        <div className="w-full">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full">
            <div className="text-m text-center text-gray-600">
              Contract: <a href={`https://sepolia.basescan.org/address/${STARTER_CONTRACT_ADDRESS}`} target="_blank" rel="noopener noreferrer">
                {STARTER_CONTRACT_ADDRESS}
              </a>
            </div>

            <Connect />

            {isConnected ? (
              <div className="space-y-6">
                <SessionKeySection
                  sessionKey={sessionKey}
                  isGenerating={isGenerating}
                  sessionKeyError={sessionKeyError}
                  generateSessionKey={generateSessionKey}
                />

                {/* Encryption Mode Toggle */}
                <div className="border p-4 rounded-md">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">
                    Encryption Mode
                  </h2>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setEncryptionMode("text")}
                      className={`flex-1 py-2 px-4 rounded-md ${
                        encryptionMode === "text"
                          ? "bg-purple-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      Text Encryption
                    </button>
                    <button
                      onClick={() => setEncryptionMode("image")}
                      className={`flex-1 py-2 px-4 rounded-md ${
                        encryptionMode === "image"
                          ? "bg-purple-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      Image Encryption
                    </button>
                  </div>
                </div>

                {/* Encryption Component */}
                {encryptionMode === "text" ? (
                  <TextEncryptDecrypt
                    sessionKey={sessionKey}
                    ethereumSealClient={ethereumSealClient}
                  />
                ) : (
                  <ImageEncryptDecrypt
                    sessionKey={sessionKey}
                    ethereumSealClient={ethereumSealClient}
                  />
                )}
              </div>
            ) : (
              <div className="text-center text-gray-600">
                Connect your wallet to request keys from the Seal key server.
              </div>
            )}
          </div>
        </div>

        <Footer />
      </div>
    </main>
  );
}
