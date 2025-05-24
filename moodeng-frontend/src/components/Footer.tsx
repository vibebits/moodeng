"use client";

export default function Footer() {
  return (
    <div className="mt-8 text-center text-sm text-gray-500">
      <p>
        This demo app interacts with the Ethereum Seal key server - secrets
        managed in decentralized and trustless way using Shamir&apos;s Secret
        Sharing algorithm.
        <br />
        Client side encrypted assets are stored safely on Walrus.xyz.
        <br />
        They can be decrypted only if `seal_approve` check in Solidity contract
        passed and threshold is met.
      </p>
    </div>
  );
}
