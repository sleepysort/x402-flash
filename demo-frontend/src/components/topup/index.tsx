'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useExportEvmAccount, useEvmAddress } from "@coinbase/cdp-hooks";

// shadcn/ui components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EqualApproximately } from 'lucide-react';

// Local components
import { TopUpPopup } from './TopUpPopup';

// Hooks
import { useThroughputConversion } from '@/hooks/useThroughputConversion';
import { useEscrowBalance } from '@/hooks/useEscrowBalance';

// Chain configuration
const CHAIN_ID = 84532; // Base Sepolia

export function USDCTopup() {
  const { address, isConnected } = useAccount();
  const { exportEvmAccount } = useExportEvmAccount();
  const { evmAddress } = useEvmAddress();
  const [usdcAmount, setUsdcAmount] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [errors, setErrors] = useState<{amount?: string}>({});
  const [exportLoading, setExportLoading] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  // Console log the sender wallet address
  console.log('Sender wallet address:', address);

  // Export key handler
  const handleExportKey = async () => {
    if (!evmAddress) return;
    setExportLoading(true);
    setExportMessage(null);
    try {
      const { privateKey } = await exportEvmAccount({ evmAccount: evmAddress });
      await navigator.clipboard.writeText(privateKey);
      setExportMessage("Private key copied to clipboard");
      setTimeout(() => {
        navigator.clipboard.writeText('');
        setExportMessage(null);
      }, 10000);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setExportLoading(false);
    }
  };

  // Use the throughput conversion hook with new real metrics
  const { 
    actualThroughput,
    defaultThroughput,
    latencyDecreasePercentage,
    escrowBalanceUSD,
    isValidEscrow,
    // Legacy fields for backward compatibility
    throughputAmount, 
    estimatedAPY, 
    dailyRewards, 
    isValidAmount,
    conversionRate 
  } = useThroughputConversion(usdcAmount);

  // Use the escrow balance hook for real-time balance
  const { 
    balance: escrowBalance, 
    loading: balanceLoading, 
    error: balanceError 
  } = useEscrowBalance({
    enabled: isConnected && !!address
  });

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Main Cards Layout */}
      <div className="flex items-start justify-center gap-6">
        {/* Left Card - Amount of USDC */}
        <Card className="w-80 h-96 flex flex-col">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">USDC Escrow Funding</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 flex-1">
            {/* Escrow Balance Display */}
            {isConnected && (
              <div className="bg-muted/30 rounded-lg p-4 border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Current Escrow Balance
                  </span>
                  {balanceLoading && (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  )}
                </div>
                <div className="mt-2">
                  {balanceError ? (
                    <span className="text-sm text-destructive">
                      Error loading balance
                    </span>
                  ) : (
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-semibold">
                        {escrowBalance !== null 
                          ? (Number(escrowBalance) / 1e6).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 6
                            })
                          : '0.00'
                        }
                      </span>
                      <span className="text-sm text-muted-foreground">USDC</span>
                      {escrowBalance === BigInt(0) && (
                        <span className="text-xs text-muted-foreground ml-2">
                          (No escrow created)
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="relative">
              <Input
                type="number"
                value={usdcAmount}
                onChange={(e) => {
                  setUsdcAmount(e.target.value);
                  if (errors.amount) setErrors({...errors, amount: undefined});
                }}
                placeholder="Enter amount"
                className={`text-2xl h-16 pr-16 ${errors.amount ? 'border-destructive' : ''}`}
                step="0.01"
                min="0"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                USDC
              </span>
            </div>
            {errors.amount && (
              <p className="text-sm text-destructive">{errors.amount}</p>
            )}
            
            {/* Quick Amount Buttons */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Quick amounts</Label>
              <div className="grid grid-cols-4 gap-2">
                {['10', '25', '50', '100'].map((preset) => (
                  <Button
                    key={preset}
                    variant="default"
                    size="sm"
                    onClick={() => setUsdcAmount(preset)}
                    className="text-sm"
                  >
                    ${preset}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Approximately Equal Symbol */}
        <div className="flex items-center justify-center p-4 h-96">
          <EqualApproximately 
            size={32} 
            className="text-muted-foreground"
          />
        </div>

        {/* Right Card - Throughput Performance */}
        <Card className="w-80 h-96 flex flex-col">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Throughput Performance</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-4 h-full flex flex-col">
              {/* Actual Throughput Display */}
              <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {isValidEscrow ? actualThroughput.toLocaleString() : '0'}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    req/s with Flash Payment
                  </div>
                </div>
              </div>

              {/* Performance Comparison */}
              {isValidEscrow && escrowBalanceUSD > 0 && (
                <div className="space-y-3">
                  <div className="bg-muted/30 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Default throughput:</span>
                      <span className="font-medium">{defaultThroughput.toLocaleString()} req/s</span>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-green-700">Latency improvement:</span>
                      <span className="font-bold text-green-700">{latencyDecreasePercentage}%</span>
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    <p>• Based on escrow balance: ${escrowBalanceUSD.toFixed(2)} USDC</p>
                    <p>• Cost per API call: $0.001</p>
                    <p>• Block confirmation time: 2s (Base)</p>
                  </div>
                </div>
              )}

              {/* No Escrow Message */}
              {!isValidEscrow && (
                <div className="text-sm text-muted-foreground text-center py-4">
                  <p>Fund your escrow to see real throughput metrics</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Action Button */}
      <div className="flex justify-center">
        <Button 
          size="lg" 
          className="px-12 py-3 text-lg font-semibold"
          disabled={!isValidAmount || !address || !isConnected}
          onClick={() => setIsDialogOpen(true)}
        >
          {!isConnected ? 'Connect Wallet' : 'Top up Escrow'}
        </Button>
      </div>

      {/* Top Up Popup */}
      <TopUpPopup
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        usdcAmount={usdcAmount}
        throughputAmount={throughputAmount}
      />

      {/* Information Footer */}
      <Alert variant="default" className="mt-8">
        <AlertDescription>
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div className="flex-1">
              <p className="font-medium mb-2">Flash Payment Information</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <p>• Network: Base Sepolia (Chain ID: {CHAIN_ID})</p>
                <p>• Escrow-based payment system</p>
                <p>• Real-time throughput calculations</p>
                <p>• Significantly reduced API latency</p>
              </div>
            </div>
            
            {/* Export Key Section */}
            <div className="flex flex-col items-end gap-2">
              <Button 
                onClick={handleExportKey}
                disabled={exportLoading || !evmAddress}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                {exportLoading ? 'Exporting...' : '🔐 Export Key'}
              </Button>
              
              {exportMessage && (
                <p className="text-xs text-green-600">{exportMessage}</p>
              )}
              
              {!evmAddress && (
                <p className="text-xs text-muted-foreground">Connect wallet to export</p>
              )}
              
              <p className="text-xs text-muted-foreground max-w-48 text-right">
                Export private key for X402 payments (dev only)
              </p>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}