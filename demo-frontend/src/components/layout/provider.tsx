// @noErrors: 2307 2580 2339 - cannot find 'process', cannot find './wagmi', cannot find 'import.meta'
'use client';

import type { ReactNode } from 'react';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { baseSepolia } from 'wagmi/chains'; // add baseSepolia for testing
import { CDPReactProvider } from '@coinbase/cdp-react';
import { CDPHooksProvider } from '@coinbase/cdp-hooks';
import { Config } from '@coinbase/cdp-core';

// CDP Configuration
const cdpConfig: Config = {
  projectId: process.env.NEXT_PUBLIC_CDP_PROJECT_ID || '', // You'll need to add this
};

export function Providers(props: { children: ReactNode }) {
  return (
    <CDPReactProvider config={cdpConfig}>
      <CDPHooksProvider config={cdpConfig}>
        <OnchainKitProvider
        apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
        projectId={process.env.NEXT_PUBLIC_CDP_PROJECT_ID}
        chain={baseSepolia}
        >
          {props.children}
        </OnchainKitProvider>
      </CDPHooksProvider>
    </CDPReactProvider>
  );
}