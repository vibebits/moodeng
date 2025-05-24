import { useState } from "react";
import { SessionKey } from "@/moodeng-seal-sdk/session-key-ethereum";
import { SessionKey as SuiSessionKey } from "@/moodeng-seal-sdk/session-key";
import { SealClient } from "@/moodeng-seal-sdk/client";
import { createStarterSealTx } from "@/utils/starter.seal";
import { getFullEncryptionId } from "@/utils/starter";
import { EncryptedObject } from "@/moodeng-seal-sdk";

interface TextEncryptDecryptProps {
  sessionKey: SessionKey | null;
  ethereumSealClient: SealClient;
}

export const TextEncryptDecrypt = ({
  sessionKey,
  ethereumSealClient,
}: TextEncryptDecryptProps) => {
  const [encryptionId, setEncryptionId] = useState("123-hippo");
  const [plaintext, setPlaintext] = useState("hello moodeng! 🦛 🦛 🦛");
  const [encryptedData, setEncryptedData] = useState<{
    ciphertext: string;
    key: string;
  } | null>(null);
  const [decryptedText, setDecryptedText] = useState<string | null>(null);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleEncrypt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionKey || !plaintext) return;

    setIsEncrypting(true);
    setLocalError(null);
    setEncryptedData(null);
    setDecryptedText(null);

    try {
      // Convert plaintext to Uint8Array
      const plaintextBytes = new TextEncoder().encode(plaintext);

      // Ensure the encryptionId is a valid hex string
      const fullEncryptionId = await getFullEncryptionId(encryptionId);
      console.log("Encryption path - ID details:", {
        original: encryptionId,
        hexEncoded: fullEncryptionId,
        has0xPrefix: fullEncryptionId.startsWith("0x"),
        length: fullEncryptionId.length,
      });

      const encryptResult = await ethereumSealClient.encrypt({
        threshold: 2,
        packageId: sessionKey.getPackageId(),
        id: fullEncryptionId,
        data: plaintextBytes,
      });

      // Store the encrypted data and key
      setEncryptedData({
        ciphertext: Buffer.from(encryptResult.encryptedObject).toString(
          "base64"
        ),
        key: Buffer.from(encryptResult.key).toString("base64"),
      });
    } catch (err) {
      console.error("Encryption error:", err);
      setLocalError(
        err instanceof Error ? err.message : "Failed to encrypt text"
      );
    } finally {
      setIsEncrypting(false);
    }
  };

  const handleDecrypt = async () => {
    if (!sessionKey || !encryptedData) return;

    setIsDecrypting(true);
    setLocalError(null);
    setDecryptedText(null);

    try {
      // Convert the base64 ciphertext to Uint8Array
      const ciphertextBytes = Buffer.from(encryptedData.ciphertext, "base64");

      // Create the seal_approve transaction
      const fullEncryptionId = await getFullEncryptionId(encryptionId);
      console.log("Encryption path - ID details:", {
        original: encryptionId,
        hexEncoded: fullEncryptionId,
        has0xPrefix: fullEncryptionId.startsWith("0x"),
        length: fullEncryptionId.length,
      });
      const tx = await createStarterSealTx({
        fullEncryptionId: fullEncryptionId as `0x${string}`
      });

      // Create a JSON array with the transaction object containing to and data fields
      const ptbJson = JSON.stringify([{
        to: tx.to,
        data: tx.data
      }]);
      
      // Convert to base64 once
      const ptbBytes = Buffer.from(ptbJson);

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

      try {
        // Call decrypt with the parameters from the signature
        console.log("Calling solanaSealClient.decrypt...");
        console.log("Input data:", {
          ciphertextLength: ciphertextBytes.length,
          sessionKeyAddress: sessionKey?.getAddress(),
          txBytesLength: ptbBytes.length,
          txBytesHex:
            Buffer.from(ptbBytes).toString("hex").slice(0, 100) + "...",
        });

        // Parse the encrypted object to check its structure
        const encryptedObject = EncryptedObject.parse(ciphertextBytes);
        console.log("Encrypted object:", {
          id: encryptedObject.id,
          packageId: encryptedObject.packageId,
          threshold: encryptedObject.threshold,
          services: encryptedObject.services,
          encryptedShares: encryptedObject.encryptedShares,
          ciphertext: encryptedObject.ciphertext,
        });

        console.log("Session key:", {
          address: sessionKey?.getAddress(),
          packageId: sessionKey?.getPackageId(),
          isExpired: sessionKey?.isExpired(),
        });

        console.log("Transaction bytes:", {
          length: ptbBytes.length,
          hex: Buffer.from(ptbBytes).toString("hex").slice(0, 100) + "...",
        });

        const decryptResult = await ethereumSealClient.decrypt({
          data: ciphertextBytes,
          sessionKey: sessionKey as unknown as SuiSessionKey,
          txBytes: ptbBytes1, // just to be same as Sui, prepend a dummy byte
        });

        if (!decryptResult) {
          throw new Error("Decrypt result is undefined");
        }

        console.log("Decrypt call completed");
        console.log("Decrypt result length:", decryptResult.length);
        console.log(
          "Decrypt result (hex):",
          Buffer.from(decryptResult).toString("hex")
        );

        // Convert result to text
        const text = new TextDecoder().decode(decryptResult);
        console.log("Decoded text:", text);
        setDecryptedText(text);
      } catch (decryptErr) {
        console.error("Decrypt error details:", {
          error: decryptErr,
          errorType: typeof decryptErr,
          errorString: String(decryptErr),
          name: decryptErr instanceof Error ? decryptErr.name : "Unknown",
          message:
            decryptErr instanceof Error
              ? decryptErr.message
              : String(decryptErr),
          stack: decryptErr instanceof Error ? decryptErr.stack : undefined,
        });
        throw decryptErr; // Re-throw to be caught by outer catch
      }
    } catch (err: unknown) {
      console.log("Error decrypting data:", err);
      if (err instanceof Error) {
        console.log("Error details:", {
          name: err.name,
          message: err.message,
          stack: err.stack,
        });
        setLocalError(err.message);
      } else {
        setLocalError("Failed to decrypt data. To decrypt successfully, the encryption ID should start with '123'.");
      }
    } finally {
      setIsDecrypting(false);
    }
  };

  return (
    <div className="border p-4 rounded-md">
      <h2 className="text-lg font-medium text-gray-900 mb-2">Encrypt Text</h2>

      <form onSubmit={handleEncrypt} className="space-y-4">
        <div>
          <label
            htmlFor="encryptionId"
            className="block text-sm font-medium text-gray-700"
          >
            Encryption ID
          </label>
          <input
            type="text"
            id="encryptionId"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border text-gray-800"
            placeholder="Enter a hex ID for encryption"
            value={encryptionId}
            onChange={(e) => setEncryptionId(e.target.value)}
            required
          />
          <p className="text-xs text-gray-500 mt-1">
          This is a string. If it starts with <em>123</em>, you can get decryption key from the server.
          </p>
        </div>

        <div>
          <label
            htmlFor="plaintext"
            className="block text-sm font-medium text-gray-700"
          >
            Text to Encrypt
          </label>
          <textarea
            id="plaintext"
            rows={4}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border text-gray-800"
            placeholder="Enter text to encrypt"
            value={plaintext}
            onChange={(e) => setPlaintext(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded w-full"
          disabled={isEncrypting || !sessionKey || !plaintext}
        >
          {isEncrypting ? "Encrypting..." : "Encrypt Text"}
        </button>

        {!sessionKey && (
          <p className="text-sm text-amber-600">
            Please generate a session key first
          </p>
        )}
      </form>

      {encryptedData && (
        <div className="mt-4 p-3 bg-gray-100 rounded">
          <h3 className="text-md font-medium text-gray-800 mb-2">
            Encrypted Result
          </h3>
          <div className="space-y-2">
            <div>
              <span className="text-xs text-gray-500">Ciphertext:</span>
              <p className="text-xs text-gray-800 font-mono break-all bg-gray-50 p-2 rounded mt-1 max-h-20 overflow-auto">
                {encryptedData.ciphertext}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-500">Encryption Key:</span>
              <p className="text-xs text-gray-800 font-mono break-all bg-gray-50 p-2 rounded mt-1">
                {encryptedData.key}
              </p>
            </div>
          </div>
        </div>
      )}

      {encryptedData && (
        <div className="mt-4">
          <button
            type="button"
            onClick={handleDecrypt}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full"
            disabled={isDecrypting}
          >
            {isDecrypting ? "Decrypting..." : "Decrypt Text"}
          </button>

          {decryptedText && (
            <div className="mt-4 p-3 bg-green-50 rounded">
              <h3 className="text-md font-medium mb-2 text-gray-800">
                Decrypted Result
              </h3>
              <p className="bg-white p-2 rounded border border-green-200 text-gray-800">
                {decryptedText}
              </p>
            </div>
          )}
        </div>
      )}
      {localError && (
        <div className="mt-2 p-2 bg-red-50 text-red-700 rounded text-sm">
          {localError}
        </div>
      )}
    </div>
  );
};
