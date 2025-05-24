'use client'

import { SessionKey } from "@/moodeng-seal-sdk/session-key-ethereum";

interface SessionKeySectionProps {
  sessionKey: SessionKey | null;
  isGenerating: boolean;
  sessionKeyError: string | null;
  generateSessionKey: () => void;
}

export function SessionKeySection({
  sessionKey,
  isGenerating,
  sessionKeyError,
  generateSessionKey,
}: SessionKeySectionProps) {
  return (
    <div className="border p-4 rounded-md">
      <h2 className="text-lg font-medium text-gray-900 mb-2">
        Session Key
      </h2>

      {sessionKey ? (
        <div className="space-y-2">
          <div className="bg-green-50 p-3 rounded-md text-green-800">
            Session key generated successfully!
          </div>

          <div className="text-xs text-gray-800 font-mono">
            <p>
              <span className="font-medium">User:</span>{" "}
              {sessionKey.getAddress()}
            </p>
            <p>
              <span className="font-medium">Contract:</span>{" "}
              {sessionKey.getPackageId()}
            </p>
            <p>
              <span className="font-medium">Expired?:</span>{" "}
              {sessionKey.isExpired()
                ? "Expired"
                : "Still valid :)"}
            </p>

            <p className="mt-2 text-gray-600">
              This session key allows you to request decryption keys
              from the Seal key server without needing to sign each
              request individually. It&apos;s valid for a limited
              time and is tied to your wallet.
            </p>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-sm text-gray-600 mb-3">
            Generate a session key to request decryption keys. This
            will require you to sign a message with your wallet.
          </p>

          <button
            type="button"
            onClick={generateSessionKey}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded w-full"
            disabled={isGenerating}
          >
            {isGenerating
              ? "Generating..."
              : "Generate Session Key"}
          </button>

          {sessionKeyError && (
            <div className="mt-2 p-2 bg-red-50 text-red-700 rounded text-sm">
              {sessionKeyError}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 