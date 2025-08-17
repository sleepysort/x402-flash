'use client';

import { 
  Transaction, 
  TransactionButton,
  TransactionStatus,
  TransactionStatusAction,
  TransactionStatusLabel,
} from '@coinbase/onchainkit/transaction';
import { FundButton, getOnrampBuyUrl } from '@coinbase/onchainkit/fund';
import { useState, useCallback, useMemo } from 'react';
import { useEvmAddress } from '@coinbase/cdp-hooks';
import { encodeFunctionData, parseUnits } from 'viem';
import { useCoinbaseOnramp } from '@/hooks/useCoinbaseOnramp';

// shadcn/ui components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

// USDC contract address on Base Sepolia (testnet)
const USDC_CONTRACT_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

// Fixed staking contract address (pseudo address for now)
const STAKING_CONTRACT_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';

// Chain configuration
const CHAIN_ID = 84532; // Base Sepolia

// ERC20 Transfer ABI
const ERC20_TRANSFER_ABI = [
  {
    "constant": false,
    "inputs": [
      {"name": "_to", "type": "address"},
      {"name": "_value", "type": "uint256"}
    ],
    "name": "transfer",
    "outputs": [{"name": "", "type": "bool"}],
    "type": "function"
  }
] as const;

interface TopUpPopupProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  usdcAmount: string;
  throughputAmount: number;
}

export function TopUpPopup({ isOpen, onOpenChange, usdcAmount, throughputAmount }: TopUpPopupProps) {
  const cdpEvmAddressData = useEvmAddress();
  const address = cdpEvmAddressData?.evmAddress;
  const [selectedTab, setSelectedTab] = useState('usdc');
  const { createTokenSession, loading: onrampLoading, error: onrampError } = useCoinbaseOnramp();

  // Generate transaction calls for staking
  const calls = useMemo(() => {
    if (!usdcAmount || parseFloat(usdcAmount) <= 0) return [];
    
    try {
      // Transfer USDC to the staking contract
      const transferData = encodeFunctionData({
        abi: ERC20_TRANSFER_ABI,
        functionName: 'transfer',
        args: [STAKING_CONTRACT_ADDRESS as `0x${string}`, parseUnits(usdcAmount, 6)] // USDC has 6 decimals
      });

      return [
        {
          to: USDC_CONTRACT_ADDRESS as `0x${string}`,
          data: transferData,
          value: BigInt(0),
        }
      ];
    } catch (error) {
      console.error('Error creating transaction calls:', error);
      return [];
    }
  }, [usdcAmount]);

  // Generate custom onramp URL for fiat payments
  const onrampBuyUrl = useMemo(() => {
    if (!address || !usdcAmount || parseFloat(usdcAmount) <= 0) return '';
    
    try {
      return getOnrampBuyUrl({
        projectId: process.env.NEXT_PUBLIC_CDP_PROJECT_ID || '',
        addresses: { [address]: ['base'] },
        assets: ['USDC'],
        presetFiatAmount: parseFloat(usdcAmount),
        fiatCurrency: 'USD',
      });
    } catch (error) {
      console.error('Error creating onramp URL:', error);
      return '';
    }
  }, [address, usdcAmount]);

  const handleTransactionStatus = useCallback((status: unknown) => {
    console.log('Transaction status:', status);
    
    switch ((status as { statusName?: string }).statusName) {
      case 'init':
        console.log('Initializing transaction...');
        break;
      case 'transactionPending':
        console.log('Transaction pending on blockchain...');
        break;
      case 'transactionLegacyExecuted':
      case 'success':
        console.log('Transaction successful!');
        onOpenChange(false);
        break;
      case 'error':
        console.error('Transaction failed:', (status as { statusData?: unknown }).statusData);
        break;
      default:
        console.log('Transaction status update:', status);
    }
  }, [onOpenChange]);

  // Handle Coinbase onramp session creation
  const handleCoinbaseOnramp = useCallback(async () => {
    if (!address || !usdcAmount || parseFloat(usdcAmount) <= 0) return;

    const response = await createTokenSession({
      addresses: [
        {
          address,
          blockchains: ['base'],
        },
      ],
      assets: ['USDC'],
    });

    if (response?.onrampUrl) {
      window.open(response.onrampUrl, '_blank', 'noopener,noreferrer');
    }
  }, [address, usdcAmount, createTokenSession]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Confirm Top Up</DialogTitle>
          <DialogDescription>
            Choose your payment method and review your staking details.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Payment Method Tabs */}
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="usdc">USDC</TabsTrigger>
              <TabsTrigger value="coinbase">Fiat</TabsTrigger>
            </TabsList>
            
            <TabsContent value="usdc" className="space-y-4">
              {/* USDC Stake Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">USDC Staking</CardTitle>
                  <CardDescription>
                    Stake your USDC directly on-chain
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Stake Amount:</span>
                      <span className="font-semibold">{usdcAmount} USDC</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Throughput Earned:</span>
                      <span className="font-semibold">{throughputAmount.toLocaleString()} units</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Network:</span>
                      <span className="font-semibold">Base Sepolia</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Staking Contract:</span>
                      <span className="font-semibold font-mono text-xs">
                        {STAKING_CONTRACT_ADDRESS.slice(0, 8)}...{STAKING_CONTRACT_ADDRESS.slice(-6)}
                      </span>
                    </div>
                  </div>

                  {/* Transaction Component */}
                  {calls.length > 0 && (
                    <Transaction
                      calls={calls}
                      chainId={CHAIN_ID}
                      onStatus={handleTransactionStatus}
                    >
                      <TransactionButton
                        disabled={!usdcAmount || !address}
                        className="w-full"
                        text="Pay with USDC"
                      />
                      <TransactionStatus>
                        <TransactionStatusLabel />
                        <TransactionStatusAction />
                      </TransactionStatus>
                    </Transaction>
                  )}

                  {/* Connection Status */}
                  {!address && (
                    <Alert variant="destructive">
                      <AlertDescription>
                        Please connect your wallet to stake USDC
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="coinbase" className="space-y-4">
              {/* Coinbase Onramp Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Coinbase Onramp</CardTitle>
                  <CardDescription>
                    Buy USDC directly through Coinbase with JWT authentication
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Purchase Amount:</span>
                      <span className="font-semibold">${usdcAmount} USD</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Asset:</span>
                      <span className="font-semibold">USDC on Base</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Throughput Earned:</span>
                      <span className="font-semibold">{throughputAmount.toLocaleString()} units</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Destination:</span>
                      <span className="font-semibold font-mono text-xs">
                        {address ? `${address.slice(0, 8)}...${address.slice(-6)}` : 'Not connected'}
                      </span>
                    </div>
                  </div>

                  {/* Coinbase Onramp Button */}
                  {address ? (
                    <Button 
                      onClick={handleCoinbaseOnramp}
                      disabled={onrampLoading || !usdcAmount || parseFloat(usdcAmount) <= 0}
                      className="w-full"
                    >
                      {onrampLoading ? 'Creating Session...' : 'Buy with Coinbase'}
                    </Button>
                  ) : (
                    <Alert variant="destructive">
                      <AlertDescription>
                        Please connect your wallet to use Coinbase onramp
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Error Display */}
                  {onrampError && (
                    <Alert variant="destructive">
                      <AlertDescription>
                        {onrampError}
                      </AlertDescription>
                    </Alert>
                  )}

                  <Alert>
                    <AlertDescription>
                      You&apos;ll be redirected to Coinbase&apos;s secure platform to complete your purchase. 
                      USDC will be sent directly to your connected wallet on Base.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
