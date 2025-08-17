'use client';

import { useState } from 'react';
import { useEvmAddress } from '@coinbase/cdp-hooks';

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

// Chain configuration
const CHAIN_ID = 84532; // Base Sepolia

export function USDCTopup() {
  const cdpEvmAddressData = useEvmAddress();
  const address = cdpEvmAddressData?.evmAddress;
  const [usdcAmount, setUsdcAmount] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [errors, setErrors] = useState<{amount?: string}>({});

  // Use the throughput conversion hook
  const { 
    throughputAmount, 
    estimatedAPY, 
    dailyRewards, 
    isValidAmount,
    conversionRate 
  } = useThroughputConversion(usdcAmount);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Main Cards Layout */}
      <div className="flex items-center justify-center gap-6">
        {/* Left Card - Amount of USDC */}
        <Card className="h-fit flex-1 max-w-md">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Amount of USDC Staked</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
        <div className="flex items-center justify-center p-4">
          <EqualApproximately 
            size={32} 
            className="text-muted-foreground"
          />
        </div>

        {/* Right Card - Amount of Throughput */}
        <Card className="h-fit flex-1 max-w-md">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Amount of Throughpu Get</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-6 text-center">
                <div className="text-3xl font-bold text-primary">
                  {throughputAmount.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Throughput Units
                </div>
              </div>
              
              {usdcAmount && isValidAmount && (
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• 1 USDC = {conversionRate} Throughput Units</p>
                  <p>• Estimated APY: {estimatedAPY}%</p>
                  <p>• Daily rewards: ~{dailyRewards} units</p>
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
          disabled={!isValidAmount || !address}
          onClick={() => setIsDialogOpen(true)}
        >
          Top up
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
          <p className="font-medium mb-2">Staking Information</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <p>• Network: Base Sepolia (Chain ID: {CHAIN_ID})</p>
            <p>• Multiple payment methods supported</p>
            <p>• Gas fees may be sponsored</p>
            <p>• Rewards are auto-compounded</p>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}