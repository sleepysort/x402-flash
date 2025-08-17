'use client';

import { useState } from 'react';
import { parseUnits } from 'viem';
import { useFlashPaymentBroker } from '@/hooks/useFlashPaymentBroker';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function FlashPaymentExample() {
  const [amount, setAmount] = useState('10'); // Default to 10 USDC
  const [escrowAddress, setEscrowAddress] = useState<string | null>(null);
  
  const { 
    createEscrow, 
    getEscrowAddress, 
    loading, 
    error, 
    serverAddress 
  } = useFlashPaymentBroker();

  const handleCreateEscrow = async () => {
    try {
      if (!amount || parseFloat(amount) <= 0) {
        alert('Please enter a valid amount');
        return;
      }

      // Convert USDC amount to wei (USDC has 6 decimals)
      const amountInWei = parseUnits(amount, 6);
      
      const resultAddress = await createEscrow(amountInWei);
      setEscrowAddress(resultAddress);
    } catch (err) {
      console.error('Failed to create escrow:', err);
    }
  };

  const handleCheckEscrow = async () => {
    try {
      const existingEscrow = await getEscrowAddress();
      setEscrowAddress(existingEscrow);
    } catch (err) {
      console.error('Failed to check escrow:', err);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Flash Payment Broker</CardTitle>
        <CardDescription>
          Create escrow for server payments using X402 standard
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Server Info */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Target Server</Label>
          <div className="text-sm text-muted-foreground">
            <div>URL: http://localhost:3002</div>
            <div>Address: {serverAddress}</div>
            <div>Endpoint: GET /hello/exact</div>
          </div>
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <Label htmlFor="amount">USDC Amount</Label>
          <Input
            id="amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter USDC amount"
            min="0"
            step="0.01"
          />
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <Button 
            onClick={handleCreateEscrow} 
            disabled={loading} 
            className="w-full"
          >
            {loading ? 'Creating Escrow...' : 'Create Escrow'}
          </Button>
          
          <Button 
            onClick={handleCheckEscrow} 
            variant="outline" 
            disabled={loading}
            className="w-full"
          >
            Check Existing Escrow
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Display */}
        {escrowAddress && (
          <Alert>
            <AlertDescription>
              <div className="space-y-1">
                <div className="font-medium">Escrow Account Created!</div>
                <div className="text-sm break-all">
                  Address: {escrowAddress}
                </div>
                <div className="text-sm text-muted-foreground">
                  You can now top up this escrow account to pay for server requests.
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Usage Instructions */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div>📝 <strong>Instructions:</strong></div>
          <div>1. Ensure your wallet is connected</div>
          <div>2. Make sure localhost:3002 server is running</div>
          <div>3. Enter USDC amount and create escrow</div>
          <div>4. Use the escrow address for payments</div>
        </div>
      </CardContent>
    </Card>
  );
}
