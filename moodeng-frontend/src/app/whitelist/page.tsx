"use client";

import { useState, useEffect } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

import useEthereumSessionKey from "@/hooks/useEthereumSessionKey";
import { useEthereumSealClient } from "@/hooks/useEthereumSealClient";
import { WHITELIST_CONTRACT_ADDRESS } from "@/utils/constants";
import WhitelistManager from "@/components/WhitelistManager";
import Footer from "@/components/Footer";

import { photoBlobs } from "@/utils/photoBlobs";
import { createWhitelistSealTx } from "@/utils/whitelist.seal";
import { SessionKey as SuiSessionKey } from "@/moodeng-seal-sdk";
import { getFullEncryptionId } from "@/utils/whitelist";
import { SessionKeySection } from "@/components/SessionKeySection";
import { Connect } from "@/components/Connect";

export default function Home() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const [whitelistStatus, setWhitelistStatus] = useState<boolean | null>(null);
  const {
    sessionKey,
    isGenerating,
    error: sessionKeyError,
    generateSessionKey,
  } = useEthereumSessionKey(WHITELIST_CONTRACT_ADDRESS);

  const ethereumSealClient = useEthereumSealClient();

  const [isDecrypting, setIsDecrypting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [decryptedImages, setDecryptedImages] = useState<(string | null)[]>([]);

  useEffect(() => {
    setDecryptedImages(Array(photoBlobs.length).fill(null));
  }, [whitelistStatus]);

  const handleDecrypt = async (photoBlobsIndex: number) => {
    if (!sessionKey) {
      setLocalError("Please generate a session key first");
      return;
    }

    setIsDecrypting(true);
    setLocalError(null);

    const photoBlob = photoBlobs[photoBlobsIndex];
    if (!photoBlob) {
      setLocalError("Invalid photo blob");
      setIsDecrypting(false);
      return;
    }

    try {
      // Convert the base64 ciphertext to Uint8Array
      const ciphertextBytes = Buffer.from(photoBlob.ciphertext, "base64");

      // Create the seal_approve transaction
      const fullEncryptionId = await getFullEncryptionId(
        photoBlob.encryptionId
      );
      console.log("Encryption path - ID details:", {
        original: photoBlob.encryptionId,
        hexEncoded: fullEncryptionId,
        has0xPrefix: fullEncryptionId.startsWith("0x"),
      });

      const tx = await createWhitelistSealTx(
        fullEncryptionId as `0x${string}`
      );

      console.log("Before fetchKeys - fullId:", fullEncryptionId);
      console.log("Before fetchKeys - tx:", tx);
      
      const ptb = [tx]; // ptb is an array of transactions
      const ptbBytes = new TextEncoder().encode(JSON.stringify(ptb));

      // prepend a dummy byte to the ptb
      const ptbBytes1 = Buffer.concat([Buffer.from([0]), ptbBytes]);

      console.log("Starting decryption process...");
      console.log("Ciphertext length:", ciphertextBytes.length);
      console.log("Session key:", sessionKey);
      console.log("Transaction length:", ptbBytes.length);
      console.log(
        "Transaction (hex):",
        Buffer.from(ptbBytes).toString("hex")
      );

      // Call decrypt with the parameters
      const decryptResult = await ethereumSealClient.decrypt({
        data: ciphertextBytes,
        sessionKey: sessionKey as unknown as SuiSessionKey,
        txBytes: ptbBytes1,
      });

      console.log("After decrypt - cachedKeys:", ethereumSealClient.getCachedKeys());

      if (decryptResult) {
        const text = new TextDecoder().decode(decryptResult);
        setDecryptedImages((prevImages) => {
          const newImages = [...prevImages];
          newImages[photoBlobsIndex] = text;
          return newImages;
        });
      } else {
        setLocalError("Decryption failed");
      }
    } catch (err) {
      console.error("Error during decryption:", err);
      setLocalError(err instanceof Error ? err.message : "Decryption failed");
    } finally {
      setIsDecrypting(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="flex flex-col items-center justify-center w-full max-w-3xl gap-8">
        <h1 className="text-4xl font-bold text-center mt-8">
          Ethereum Seal Whitelist Demo
        </h1>

        <div className="w-full">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full">
            <div className="text-center text-gray-600">
              Contract: <a href={`https://sepolia.basescan.org/address/${WHITELIST_CONTRACT_ADDRESS}`} target="_blank" rel="noopener noreferrer">
                {WHITELIST_CONTRACT_ADDRESS.toString()}
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
                <WhitelistManager
                  contractAddress={WHITELIST_CONTRACT_ADDRESS}
                  whitelistStatus={whitelistStatus}
                  setWhitelistStatus={setWhitelistStatus}
                />

                {/* Decrypt Section */}
                {whitelistStatus && (
                  <div className="border p-4 rounded-md">
                    <h2 className="text-lg font-medium text-gray-900 mb-2">
                      Images for only whitelisted users
                    </h2>
                    <div className="mt-4 grid grid-cols-3 gap-4">
                      {photoBlobs.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => handleDecrypt(index)}
                          disabled={
                            isDecrypting || decryptedImages[index] !== null
                          }
                          className={`px-4 py-2 rounded ${
                            isDecrypting || decryptedImages[index] !== null
                              ? "bg-gray-400 cursor-not-allowed"
                              : "bg-blue-600 hover:bg-blue-700 text-white"
                          }`}
                        >
                          {isDecrypting
                            ? "Decrypting..."
                            : `Decrypt Image ${index + 1}`}
                        </button>
                      ))}
                    </div>
                    {localError && (
                      <div className="mt-4 p-3 bg-red-50 text-red-700 rounded text-sm">
                        {localError}
                      </div>
                    )}
                    <div className="mt-4 grid grid-cols-3 gap-4">
                      {decryptedImages.map(
                        (image, index) =>
                          image && (
                            <div
                              key={index}
                              className="p-3 bg-green-50 rounded"
                            >
                              <img
                                src={image}
                                alt={`Decrypted Image ${index + 1}`}
                                className="w-full h-auto"
                                onError={() => {
                                  console.error(
                                    `Failed to load image ${index + 1}`
                                  );
                                  setLocalError(
                                    `Failed to load image ${index + 1}`
                                  );
                                }}
                              />
                            </div>
                          )
                      )}
                    </div>
                  </div>
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
