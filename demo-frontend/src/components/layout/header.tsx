'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useBalance, useChainId, useAccount } from 'wagmi';
import { AuthButton } from '@coinbase/cdp-react/components/AuthButton';
import { Button } from '@/components/ui/button';
import { Copy, Check, Github } from 'lucide-react';
import { getUSDCAddress } from '@/lib/circle-paymaster';

export function Header() {
  const chainId = useChainId();
  const [copied, setCopied] = useState(false);
  
  // Use Wagmi's unified account state - this will be connected when CDP user signs in
  const { address, isConnected } = useAccount();
  
  // Use the unified wallet address from Wagmi
  const displayAddress = isConnected && address ? address : null;
  
  const { data: balance } = useBalance({
    address: displayAddress as `0x${string}`,
    token: getUSDCAddress(chainId),
  });

  const copyAddress = async () => {
    if (displayAddress) {
      try {
        await navigator.clipboard.writeText(displayAddress);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy address:', err);
      }
    }
  };

  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex-1">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="hover:bg-gray-100"
        >
          <Link
            href="https://github.com/sleepysort/x402-flash"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2"
          >
            <Github className="h-5 w-5" />
            <span className="text-sm">GitHub</span>
          </Link>
        </Button>
      </div>
      <h1 className="text-2xl font-bold text-gray-800">x402-flash</h1>
      <div className="flex-1 flex items-center justify-end">
        
        {displayAddress && (
          <div className="flex flex-col items-end mr-3">
            <div className="flex items-center mb-1">
              <span className="text-sm text-gray-600 font-mono mr-2">
                {displayAddress.slice(0, 6)}...{displayAddress.slice(-4)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyAddress}
                className="h-6 w-6 p-0 hover:bg-gray-100"
                title={copied ? "Copied!" : "Copy address"}
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-600" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
            <div className="text-right text-sm font-mono">
              {balance ? Number(balance.value) / 10**balance.decimals : '0'} USDC
            </div>
          </div>
        )}
        <AuthButton />
      </div>
    </div>
  );
}
