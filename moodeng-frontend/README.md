# Moodeng - Ethereum Seal Key Server Frontend

This is a Next.js frontend application that demonstrates how to interact with the Ethereum Seal Key Server. It allows users to connect their Ethereum wallet, create Ethereum transactions, and request decryption keys from the key servers.

## Features

- Ethereum wallet integration via viem and wagami
- Transactions bundling and simulation via Tenderly
- Key request and retrieval from the Seal key server
- Responsive UI for desktop and mobile

## Prerequisites

- Node.js 18+ and npm/pnpm
- An Ethereum wallet (like Metamask)
- Access to a running Seal key server

## Getting Started

1. Clone the repository

2. Install dependencies
   ```bash
   pnpm install
   ```

3. Set up environment variables
   Copy `example.env` into `.env` enter the env variables.

4. Run the development server
```bash
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application

## How It Works

1. **Connect Wallet**: Click the "Connect Wallet" button to connect your Ethereum wallet.

2. **Create a session key**: Session key authorizes Seal key server to call `seal_approve` function a Ethereum contract for a period of time. So you won't need to sign for each request for a decryption key.

2. **Enter Key ID**: Enter an encryption id that will be used in the Ethereum transaction call to seal_approve method. (for starter example, id that starts with '123' will pass `seal_approve` check, so decryption will be successful)

3. **Request Key**: Click the "Request Key" button to:
   - Create a transaction with one or more `seal_approve` instructions
   - No need to sign as session key is used and the transaction is only simulated.
   - Send the request to the key servers
   - Servers check `seal_approve` of the Solana program
   - If the function return `true`, servers return decryption keys

4. **View Results**: If threshold of keys are received, then decryption can be made successfully.

## Integration Details

The app demonstrates a complete flow for interacting with the Seal key server:

1. **Encryption**: Encrypt client-side with encryption id
2. **Wallet Signing**: Uses Solana wallet adapters for transaction and message signing
3. **API Request**: Formats and sends the request to the key server
4. **Decryption**: Fetch keys and decrypt

## Customization

You can modify the application to suit your specific needs:

- Update the `.env` for `STARTER_CONTRACT_ADDRESS` or `WHITELIST_CONTRACT_ADDRESS` with your own contract addresses to try out with your own `seal_approve` logic
- Read more about **identity based encryption** (https://github.com/MystenLabs/seal/blob/main/Design.md) to develop your own access policy patterns

