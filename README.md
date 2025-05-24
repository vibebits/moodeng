# Moodeng: Walrus + Seal on EVM chains
Unleash the power of Walrus.xyz and Seal on EVM chains. Now the decentralized storage is programmable natively with Solidity contracts..

## Demos
- **Starter**
https://moodeng-seal-dapp.vercel.app/starter

interacts with [0xb492bb3849046633a5a0656cbeedb3a8b4f8fceb](https://sepolia.basescan.org/address/0xb492bb3849046633a5a0656cbeedb3a8b4f8fceb)

- **Whitelist**
https://moodeng-seal-dapp.vercel.app/whitelist

interacts with [0xb9d6d9658d9c3ada12afc1ec1b65b5852bca29cb](https://sepolia.basescan.org/address/0xb9d6d9658d9c3ada12afc1ec1b65b5852bca29cb)

- **Key servers**
 - [moodeng-key-server-1](https://moodeng-key-server-1.up.railway.app) of object id: [0xbcfde612585c2206fa7ca59debf31d6f4eb739b0a99878277d0b8a8612d083cf](https://suiscan.xyz/testnet/object/0xbcfde612585c2206fa7ca59debf31d6f4eb739b0a99878277d0b8a8612d083cf/tx-blocks)
  - [moodeng-key-server-2](https://moodeng-key-server-2.up.railway.app) of object id: [0x3b86e0c7a3399a5df8a11531df25193d412dd45811a04344907f2469da57fc31](https://suiscan.xyz/testnet/object/0x3b86e0c7a3399a5df8a11531df25193d412dd45811a04344907f2469da57fc31/tx-blocks)

## Overview
Moodeng: Ethereum Seal is an ingenious project that bridges the gap between Ethereum and Walrus' decentralized storage solution. It enables EVM contracts and wallets to interact seamlessly with Walrus.xyz (decentralized storage) and Seal (decentralized secrets management), making decentralized storage programmable across the EVM chain.

## Features
- Native integration with EVM Solidity contracts
- Support for EVM ECDSA signature, transaction, and simulation in the key servers
- TypeScript SDK for easy integration
- Decentralized storage capabilities through Walrus.xyz and Seal
- Secure key management through dedicated key servers (leveraging Shamir's secret sharing scheme)
- Pre-built patterns and templates for common use cases
- Demo applications showcasing various implementations

## Architecture
The project consists of several key components:

### Key Server
Located in `/crates/key-server/src/ethereum`, the key server component manages secure key storage and retrieval operations. It provides a secure interface for EVM Solidity contracts to interact with decentralized storage networks.

### TypeScript SDK
The `/moodeng-ts-sdk` SDK provides a developer-friendly interface for integrating Ethereum Seal functionality into your frontend applications. It includes:
- Helper for session key management in Ethereum way
- Helper functions and hooks
- Integration utilities
- Example implementations

### Ethereum Solidity contracts
The `/moodeng-contracts` directory contains pre-built solidity contracts that implement common patterns for access control for decentralized storage. These programs serve as templates and can be customized for specific use cases.

### Demo Applications
The `/moodeng-frontend` directory contains example applications demonstrating the capabilities of Moodeng: Ethereum Seal:
- **Starter Dapp**: A basic implementation showcasing the complete encryption and decryption flow for developers to get started easily
- **Whitelist Dapp**: An advanced example with access control features based on whitelists

## Deployed Infrastructure

### Key Servers
- Server #1
  - URL: https://moodeng-key-server-1.up.railway.app
  - Sui Object: https://suiscan.xyz/testnet/object/0xbcfde612585c2206fa7ca59debf31d6f4eb739b0a99878277d0b8a8612d083cf/tx-blocks
- Server #2
  - URL: https://moodeng-key-server-2.up.railway.app
  - Sui Object: https://suiscan.xyz/testnet/object/0x3b86e0c7a3399a5df8a11531df25193d412dd45811a04344907f2469da57fc31/tx-blocks

### Deployed Contracts
- Starter Contract: A basic implementation for getting started
 - https://sepolia.basescan.org/address/0xb492bb3849046633a5a0656cbeedb3a8b4f8fceb
- Whitelist Contract: Advanced implementation with access control features
 - https://sepolia.basescan.org/address/0xb9d6d9658d9c3ada12afc1ec1b65b5852bca29cb

 ## seal_approve for EVM Solidity contracts

 `seal_approve` is used as access policy control programmable in Solidity contracts. It is checked by the key servers to determine access.

 It can be tweaked to define any logic. Example below.

 ```solidity
// Function to check if an address is in a whitelist
// return just true or false
// do not throw errors so that transactions can be bundled for simulation
function seal_approve(bytes32 fullId) external returns (bool) {
    // fullId = 16 bytes whitelistId + 16 bytes encryptionId

    // get whitelistId
    bytes16 whitelistId = bytes16(fullId);

    // check user is in whitelist (msg.sender is the signer of sessionKey)
    bool success = whitelists[whitelistId].addresses[msg.sender];

    emit WhitelistChecked(whitelistId, msg.sender, success);
    return success;
}
 ```

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- TypeScript

### Installation
1. Clone the repository:
```bash
git clone https://github.com/vibebits/moodeng.git
cd moodeng/moodeng-frontend
```

2. Install dependencies:
```bash
pnpm install
```

3. Set .env variables and set them:
```bash
cp example.env .env
```

4. Run the dev locally:
```bash
pnpm run dev
```

5. Check out the demos:
- http://localhost:3000/starter
- http://localhost:3000/whitelist

### Usage of hooks
1. useEthereumSealClient hook:
```typescript
import { useEthereumSealClient } from "@/hooks/useEthereumSealClient";

const ethereumSealClient = useEthereumSealClient();
```

2. useEthereumSessionKey hook:
```typescript
import useEthereumSessionKey from "@/hooks/useEthereumSessionKey";

const {
  sessionKey,
  isGenerating,
  error: sessionKeyError,
  generateSessionKey,
} = useEthereumSessionKey('CONTRACT-ADDRESS');
```

## Contributing
We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support
For support, please open an issue in the GitHub repository or contact the maintainers.

## Roadmap
- [ ] Additional program patterns
- [ ] Enhanced security features
- [ ] More demo applications
- [ ] Cross-chain integration capabilities