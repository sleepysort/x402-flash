'use client';

import { useState, useEffect } from 'react';
import { useFlashPayment } from '@/hooks/useFlashPayment';
import { parseUnits } from 'viem';
import { decodeXPaymentResponse } from 'x402-fetch';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { encodeFunctionData } from 'viem';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface PaymentResult {
  success: boolean;
  data?: string;
  error?: string;
  timeTaken?: number;
  response?: Response;
  paymentInfo?: any;
}

export function FlashPaymentTester() {
  const [endpoint, setEndpoint] = useState('/hello');
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [escrowAddress, setEscrowAddress] = useState<string | null>(null);
  
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { 
    makeFlashPayment, 
    loading, 
    error, 
    serverAddress,
    getEscrowAddress,
    createEscrow,
    approveTokens 
  } = useFlashPayment();

  // Check escrow status on component mount
  useEffect(() => {
    const checkEscrow = async () => {
      try {
        const address = await getEscrowAddress();
        setEscrowAddress(address);
      } catch (err) {
        console.error('Failed to check escrow:', err);
      }
    };
    checkEscrow();
  }, [getEscrowAddress]);

  const handleCreateEscrow = async () => {
    try {
      const amount = parseUnits('10', 6); // 10 USDC
      const address = await createEscrow(amount);
      setEscrowAddress(address);
    } catch (err) {
      console.error('Failed to create escrow:', err);
    }
  };

  const handleFlashPayment = async () => {
    try {
      const proxyUrl = `/api/flash-server?path=${endpoint}`;
      const result = await makeFlashPayment({
        url: proxyUrl,
        method: 'GET',
      });
      setResult(result);
    } catch (err) {
      console.error('Flash payment failed:', err);
      setResult({
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  };

  const handleRegularFetch = async () => {
    if (!address) {
      setResult({
        success: false,
        error: 'Wallet not connected',
      });
      return;
    }

    try {
      const startTime = Date.now();
      const proxyUrl = `/api/flash-server?path=${endpoint}`;
      
      // Step 1: Make initial request to get payment requirements
      console.log('Making initial X402 request...');
      const initialResponse = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      // If not 402, return immediately
      if (initialResponse.status !== 402) {
        const data = await initialResponse.text();
        const timeTaken = Date.now() - startTime;
        
        setResult({
          success: initialResponse.ok,
          data,
          timeTaken,
          response: initialResponse,
          error: initialResponse.ok ? undefined : `HTTP ${initialResponse.status}: ${initialResponse.statusText}`,
        });
        return;
      }

      // Step 2: Handle 402 Payment Required - Implement X402 "exact" payment scheme
      console.log('Received 402, implementing X402 exact payment scheme...');
      const paymentInfo = await initialResponse.json();
      console.log('Payment info:', paymentInfo);

      if (!walletClient || !publicClient) {
        throw new Error('Wallet not properly connected');
      }

      // Extract payment requirements
      const paymentRequirements = paymentInfo.accepts || [];
      if (paymentRequirements.length === 0) {
        throw new Error('No payment requirements provided');
      }

      // Get the first payment requirement (should be USDC)
      const requirement = paymentRequirements[0];
      const amount = BigInt(parseInt(requirement.maxAmountRequired));
      
      // Import necessary functions
      const { getUSDCAddress } = await import('@/lib/circle-paymaster');
      
      const chainId = publicClient.chain?.id;
      if (!chainId) throw new Error('Chain ID not available');
      
      const usdcAddress = getUSDCAddress(chainId);
      
      console.log(`X402 Exact Payment: Sending ${amount} USDC to server ${serverAddress}`);
      
      // Step 3: Approve USDC for direct transfer to server
      console.log('Approving USDC for direct transfer...');
      await approveTokens(usdcAddress, serverAddress, amount);
      
      // Step 4: Execute direct USDC transfer to server (X402 "exact" payment)
      const ERC20_ABI = [
        {
          name: 'transfer',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' }
          ],
          outputs: [{ name: '', type: 'bool' }],
        },
      ] as const;

      console.log('Executing direct USDC transfer (X402 exact payment)...');
      const { request } = await publicClient.simulateContract({
        account: address,
        address: usdcAddress,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [serverAddress, amount],
      });

      const txHash = await walletClient.writeContract(request);
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      
      console.log('Direct payment transaction confirmed:', txHash);

      // Step 5: Build X402 payment header with transaction proof
      const paymentObj = {
        x402Version: 1,
        scheme: "exact",
        network: "base-sepolia",
        payload: txHash // Transaction hash as proof of direct payment
      };
      
      const paymentHeader = btoa(JSON.stringify(paymentObj));
      
      // Step 6: Retry original request with X-Payment header
      console.log('Retrying request with X402 payment proof...');
      const paymentResponse = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Payment': paymentHeader,
        },
      });

      const responseData = await paymentResponse.text();
      const timeTaken = Date.now() - startTime;

      // Parse X-Payment-Response header
      const xPaymentResponse = paymentResponse.headers.get("x-payment-response");
      let decodedPaymentResponse = null;
      if (xPaymentResponse) {
        try {
          decodedPaymentResponse = JSON.parse(atob(xPaymentResponse));
          console.log('X402 Payment response:', decodedPaymentResponse);
        } catch (e) {
          console.warn('Failed to decode x-payment-response header');
        }
      }

      setResult({
        success: paymentResponse.ok,
        data: responseData,
        timeTaken,
        response: paymentResponse,
        paymentInfo: decodedPaymentResponse,
        error: paymentResponse.ok ? undefined : `HTTP ${paymentResponse.status}: ${paymentResponse.statusText}`,
      });

    } catch (err) {
      setResult({
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  };

  const formatResponseData = (data: string) => {
    try {
      // Try to parse and pretty-print JSON
      const parsed = JSON.parse(data);
      return JSON.stringify(parsed, null, 2);
    } catch {
      // Return as-is if not JSON
      return data;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          ⚡ X402 Flash Payment Tester
        </CardTitle>
        <CardDescription>
          Test X402 flash payments by making requests to payment-required endpoints.
          This replicates your CLI script functionality in the browser.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Escrow Status */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Escrow Status</Label>
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm">
                  <strong>Server:</strong> {serverAddress}
                </div>
                <div className="text-sm">
                  <strong>Escrow:</strong> {
                    escrowAddress && escrowAddress !== '0x0000000000000000000000000000000000000000' 
                      ? `${escrowAddress.slice(0, 6)}...${escrowAddress.slice(-4)}`
                      : 'Not created'
                  }
                </div>
              </div>
              {(!escrowAddress || escrowAddress === '0x0000000000000000000000000000000000000000') && (
                <Button 
                  onClick={handleCreateEscrow}
                  disabled={loading}
                  size="sm"
                  variant="outline"
                >
                  Create Escrow
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Endpoint Selection */}
        <div className="space-y-2">
          <Label htmlFor="endpoint">API Endpoint</Label>
          <select
            id="endpoint"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
          >
            <option value="/hello">GET /hello - $0.001 (Hello World)</option>
            <option value="/random">GET /random - $0.0001 (Random Number)</option>
          </select>
          <div className="text-xs text-muted-foreground">
            These endpoints require X402 payment. Proxied through /api/flash-server to avoid CORS.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button 
            onClick={handleFlashPayment} 
            disabled={loading || !address}
            className="flex-1"
            size="lg"
          >
            {loading ? 'Processing Flash Payment...' : '⚡ Flash Payment'}
          </Button>
          
          <Button 
            onClick={handleRegularFetch} 
            variant="outline"
            disabled={loading || !address}
            className="flex-1"
            size="lg"
          >
            💳 X402 Payment
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Result Display */}
        {result && (
          <div className="space-y-4">
            {/* Status Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={result.success ? "default" : "destructive"}>
                {result.success ? '✅ Success' : '❌ Failed'}
              </Badge>
              {result.timeTaken && (
                <Badge variant="outline">
                  ⏱️ {result.timeTaken}ms
                </Badge>
              )}
              {result.response && (
                <Badge variant={result.response.status === 200 ? "default" : result.response.status === 402 ? "secondary" : "destructive"}>
                  HTTP {result.response.status}
                </Badge>
              )}
              {result.paymentInfo && (
                <Badge variant="outline">
                  💳 Payment Processed
                </Badge>
              )}
            </div>

            {/* Error Message */}
            {result.error && (
              <Alert variant="destructive">
                <AlertDescription>{result.error}</AlertDescription>
              </Alert>
            )}

            {/* Payment Info */}
            {result.paymentInfo && (
              <Alert>
                <AlertDescription>
                  <div className="space-y-1">
                    <div className="font-medium">💳 Payment Response Received:</div>
                    <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                      {JSON.stringify(result.paymentInfo, null, 2)}
                    </pre>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Response Data */}
            {result.data && (
              <div>
                <Label className="text-sm font-medium">📋 Response Data:</Label>
                <pre className="mt-2 p-3 bg-muted rounded-lg text-sm overflow-auto max-h-60 whitespace-pre-wrap">
                  {formatResponseData(result.data)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-muted-foreground space-y-1 p-4 bg-muted rounded-lg">
          <div className="font-medium mb-2">💡 How to Use:</div>
                      <div className="space-y-1">
            <div>1. 🔗 <strong>Connect your wallet</strong> to Base Sepolia network</div>
            <div>2. 🚀 <strong>Start the demo server:</strong> <code className="bg-background px-1 rounded">cd demo-api-server && npm run dev</code></div>
            <div>3. 💳 <strong>Create escrow account</strong> if not already created (auto-creates with 10 USDC)</div>
            <div>4. 💳 <strong>Try "X402 Payment"</strong> - Direct USDC transfer to server (X402 exact scheme)</div>
            <div>5. ⚡ <strong>Try "Flash Payment"</strong> - Uses escrow + settlement contract (X402 flash scheme)</div>
            <div>6. 📊 <strong>View results</strong> including timing and payment confirmation</div>
          </div>
          <div className="mt-2 pt-2 border-t">
            <div className="font-medium">🎯 Payment Methods:</div>
            <div className="text-xs space-y-1">
              <div><strong>⚡ Flash Payment:</strong> Uses escrow + settlement contract (X402 flash scheme)</div>
              <div><strong>💳 X402 Payment:</strong> Direct USDC transfer to server (X402 exact scheme)</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
