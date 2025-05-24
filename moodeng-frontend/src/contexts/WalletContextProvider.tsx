'use client';

import { FC, ReactNode } from 'react';
import { wagmiAdapter, projectId } from '@/config'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createAppKit } from '@reown/appkit';
import { baseSepolia, optimismSepolia } from '@reown/appkit/networks';
import { cookieToInitialState, WagmiProvider, type Config } from 'wagmi'

// Set up metadata
const metadata = {
  name: 'moodeng',
  description: 'Moodeng',
  url: 'https://reown.com/appkit', // origin must match your domain & subdomain
  icons: ['https://assets.reown.com/reown-profile-pic.png']
}

// Create the modal
export const modal = createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: [baseSepolia, optimismSepolia] as any,
  defaultNetwork: baseSepolia as any,
  metadata: metadata,
  features: {
    analytics: true, // Optional - defaults to your Cloud configuration
  }
})

const queryClient = new QueryClient();

interface WalletContextProviderProps {
  children: ReactNode;
  cookies: string | null;
}

export const WalletContextProvider: FC<WalletContextProviderProps> = ({ children , cookies }) => {
  const initialState = cookieToInitialState(wagmiAdapter.wagmiConfig as Config, cookies)

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as Config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default WalletContextProvider; 