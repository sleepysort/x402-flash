// @noErrors: 2307 2580 2339 - cannot find 'process', cannot find './wagmi', cannot find 'import.meta'
'use client';

import type { ReactNode } from 'react';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { baseSepolia } from 'wagmi/chains';
import { Config } from '@coinbase/cdp-core';
import { createCDPEmbeddedWalletConnector } from '@coinbase/cdp-wagmi';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http } from "viem";
import { WagmiProvider, createConfig } from 'wagmi';
import { CDPReactProvider } from '@coinbase/cdp-react';
import { CDPHooksProvider } from '@coinbase/cdp-hooks';

// CDP Configuration
const cdpConfig: Config = {
  projectId: process.env.NEXT_PUBLIC_CDP_PROJECT_ID || '',
  // Use our proxy API endpoint instead of direct CDP API calls
  baseUrl: typeof window !== 'undefined' ? `${window.location.origin}/api/cdp` : '/api/cdp',
};

// Create the CDP-Wagmi connector
const connector = createCDPEmbeddedWalletConnector({
  cdpConfig: cdpConfig,
  providerConfig: {
    chains: [baseSepolia],
    transports: {
      [baseSepolia.id]: http()
    }
  }
});

// Configure Wagmi with CDP connector
const wagmiConfig = createConfig({
  connectors: [connector],
  chains: [baseSepolia],
  transports: {
    [baseSepolia.id]: http(),
  },
});

const queryClient = new QueryClient();

export function Providers(props: { children: ReactNode }) {
  return (
    <CDPReactProvider config={cdpConfig}>
      <CDPHooksProvider config={cdpConfig}>
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <OnchainKitProvider
              apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
              projectId={process.env.NEXT_PUBLIC_CDP_PROJECT_ID}
              chain={baseSepolia}
            >
              {props.children}
            </OnchainKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </CDPHooksProvider>
    </CDPReactProvider>
  );
}