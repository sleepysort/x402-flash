'use client';
import { useState } from 'react';
import { useBalance, useChainId } from 'wagmi';
import { AuthButton } from '@coinbase/cdp-react/components/AuthButton';
import { useIsSignedIn, useEvmAddress } from '@coinbase/cdp-hooks';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { getUSDCAddress } from '@/lib/circle-paymaster';

export function Header() {
  const chainId = useChainId();
  const [copied, setCopied] = useState(false);
  
  // CDP Authentication hooks ONLY
  const isSignedIn = useIsSignedIn();
  const cdpEvmAddressData = useEvmAddress();
  
  // Extract the actual address from the CDP hook result
  const cdpEvmAddress = cdpEvmAddressData?.evmAddress;
  
  // Use CDP address only - no fallback
  const displayAddress = isSignedIn && cdpEvmAddress ? cdpEvmAddress : null;
  
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
      <div className="flex-1 flex items-center justify-end">
        {/* Show CDP authentication status only */}
        <div className="mr-4 text-xs text-gray-500">
          CDP: {isSignedIn ? 'Signed In' : 'Not Signed In'}
        </div>
        
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
