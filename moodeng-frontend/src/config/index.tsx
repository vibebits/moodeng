import { cookieStorage, createStorage, http } from '@wagmi/core'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { baseSepolia } from '@reown/appkit/networks'

// Get projectId from https://cloud.reown.com
export const projectId = process.env.NEXT_PUBLIC_APPKIT_PROJECT_ID || '7e0699052d4b17209cb31a04581f57da';

if (!projectId) {
  throw new Error('Project ID is not defined')
}

export const networks = [baseSepolia]

//Set up the Wagmi Adapter (Config)
export const wagmiAdapter = new WagmiAdapter({
    storage: createStorage({
      storage: cookieStorage,
      key: 'wagmi.cache'
    }) as any,
    ssr: true,
    projectId,
    networks: networks as any
})

export const config = wagmiAdapter.wagmiConfig