'use client';

// Removed OnchainKit Transaction imports - using Circle transaction instead
// import { 
//   Transaction, 
//   TransactionButton,
//   TransactionStatus,
//   TransactionStatusAction,
//   TransactionStatusLabel,
// } from '@coinbase/onchainkit/transaction';
import { FundButton, getOnrampBuyUrl } from '@coinbase/onchainkit/fund';
import { useState, useCallback, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { encodeFunctionData, parseUnits, formatUnits } from 'viem';
import { useCoinbaseOnramp } from '@/hooks/useCoinbaseOnramp';
import { useUSDCBalance } from '@/hooks/useUSDCBalance';
import { useCircleTransaction } from '@/hooks/useCircleTransaction';
import { useEscrowStatus } from '@/hooks/useEscrowStatus';
import { useEscrowBalance } from '@/hooks/useEscrowBalance';

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

// Flash Payment Broker imports
import { FlashPaymentBrokerABI } from '@/abi/FlashPaymentBroker';
import { getFlashPaymentBrokerAddress, MVP_SERVER_CONFIG } from '@/lib/flash-payment-broker';

// USDC contract address on Base Sepolia (testnet)
const USDC_CONTRACT_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

// Chain configuration
const CHAIN_ID = 84532; // Base Sepolia

// ERC20 Approve ABI for allowing FlashPaymentBroker to spend USDC
const ERC20_APPROVE_ABI = [
  {
    "constant": false,
    "inputs": [
      {"name": "_spender", "type": "address"},
      {"name": "_value", "type": "uint256"}
    ],
    "name": "approve",
    "outputs": [{"name": "", "type": "bool"}],
    "type": "function"
  }
] as const;

// ERC20 Transfer ABI for direct USDC transfers to escrow
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
  serverAddress?: string; // Server address for escrow funding
  onSuccess?: () => void; // Callback for successful escrow funding
}

export function TopUpPopup({ isOpen, onOpenChange, usdcAmount, throughputAmount, serverAddress, onSuccess }: TopUpPopupProps) {
  const { address, isConnected } = useAccount();
  const [selectedTab, setSelectedTab] = useState('usdc');
  const { createTokenSession, loading: onrampLoading, error: onrampError } = useCoinbaseOnramp();
  const { balance: usdcBalance, balanceFormatted, loading: balanceLoading, hasMinimumBalance, refetch: refetchBalance } = useUSDCBalance();
  const { executeTransaction, isLoading: transactionLoading } = useCircleTransaction();
  const [transactionStatus, setTransactionStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');

  // Use provided server address or default to MVP server
  const effectiveServerAddress = serverAddress || MVP_SERVER_CONFIG.walletAddress;

  // Check if escrow already exists for this client-server pair
  const { 
    isEscrowOpen, 
    escrowAddress, 
    loading: escrowStatusLoading, 
    error: escrowStatusError,
    refetch: refetchEscrowStatus 
  } = useEscrowStatus({
    clientAddress: address,
    serverAddress: effectiveServerAddress as `0x${string}`,
    enabled: isConnected && !!address && isOpen
  });

  // Get current escrow balance if escrow exists
  const { 
    balance: escrowBalance, 
    loading: escrowBalanceLoading,
    refetch: refetchEscrowBalance
  } = useEscrowBalance({
    clientAddress: address,
    serverAddress: effectiveServerAddress as `0x${string}`,
    enabled: isEscrowOpen === true && isConnected && !!address && isOpen
  });

  // Validate balance and calculate transaction requirements
  const transactionValidation = useMemo(() => {
    if (!usdcAmount || parseFloat(usdcAmount) <= 0) {
      return { isValid: false, error: 'Invalid amount', requiredAmount: BigInt(0), isTopUp: false };
    }

    const requiredAmount = parseUnits(usdcAmount, 6); // USDC has 6 decimals
    const hasSufficientBalance = hasMinimumBalance(requiredAmount);

    // Determine if this is a top-up (escrow exists) or new escrow creation
    const isTopUp = isEscrowOpen === true;

    return {
      isValid: hasSufficientBalance,
      error: hasSufficientBalance ? null : 'Insufficient USDC balance',
      requiredAmount,
      currentBalance: usdcBalance || BigInt(0),
      shortfall: hasSufficientBalance ? BigInt(0) : requiredAmount - (usdcBalance || BigInt(0)),
      isTopUp
    };
  }, [usdcAmount, hasMinimumBalance, usdcBalance, isEscrowOpen]);

  // Note: Removed calls generation - now using Circle transaction directly

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

  // Handle Circle transaction execution
  const handleCircleTransaction = useCallback(async () => {
    if (!transactionValidation.isValid || !effectiveServerAddress) return;

    try {
      setTransactionStatus('pending');
      const amount = transactionValidation.requiredAmount;
      
      if (transactionValidation.isTopUp) {
        // Top up existing escrow account
        console.log('🔄 Starting escrow top-up with USDC gas payment...');
        console.log('Topping up existing escrow at:', escrowAddress);

        if (!escrowAddress) {
          throw new Error('Escrow address not found');
        }

        // Direct USDC transfer to existing escrow account
        console.log('📝 Transferring USDC to existing escrow...');
        const transferData = encodeFunctionData({
          abi: ERC20_TRANSFER_ABI,
          functionName: 'transfer',
          args: [escrowAddress as `0x${string}`, amount]
        });

        await executeTransaction({
          to: USDC_CONTRACT_ADDRESS,
          data: transferData,
        });

        console.log('✅ Escrow top-up successful');
        console.log('Added', usdcAmount, 'USDC to escrow for server:', effectiveServerAddress);
        
      } else {
        // Create new escrow account
        console.log('🔄 Starting new escrow creation with USDC gas payment...');
        
        const brokerAddress = getFlashPaymentBrokerAddress(CHAIN_ID);

        // Step 1: Approve FlashPaymentBroker to spend USDC
        console.log('📝 Step 1: Approving USDC spending...');
        const approveData = encodeFunctionData({
          abi: ERC20_APPROVE_ABI,
          functionName: 'approve',
          args: [brokerAddress, amount]
        });

        await executeTransaction({
          to: USDC_CONTRACT_ADDRESS,
          data: approveData,
        });

        console.log('✅ USDC approval successful');

        // Step 2: Open escrow with the approved amount
        console.log('📝 Step 2: Opening escrow...');
        const openEscrowData = encodeFunctionData({
          abi: FlashPaymentBrokerABI,
          functionName: 'openEscrow',
          args: [effectiveServerAddress as `0x${string}`, USDC_CONTRACT_ADDRESS as `0x${string}`, amount]
        });

        await executeTransaction({
          to: brokerAddress,
          data: openEscrowData,
        });

        console.log('✅ Escrow opening successful');
        console.log('Transaction completed for server:', effectiveServerAddress);
      }
      
      setTransactionStatus('success');
      onOpenChange(false);
      
      // Refresh USDC balance, escrow status, and escrow balance
      refetchBalance();
      refetchEscrowStatus();
      refetchEscrowBalance();
      
      // Call success callback to refresh escrow balance
      if (onSuccess) {
        console.log('🚀 Calling onSuccess callback...');
        onSuccess();
      } else {
        console.warn('⚠️ No onSuccess callback provided');
      }

    } catch (error) {
      console.error('❌ Circle transaction failed:', error);
      setTransactionStatus('error');
    }
  }, [transactionValidation, effectiveServerAddress, executeTransaction, onOpenChange, refetchBalance, refetchEscrowStatus, refetchEscrowBalance, onSuccess, escrowAddress, usdcAmount]);

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
              {/* USDC Escrow Funding Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {transactionValidation.isTopUp ? 'Top Up Existing Escrow' : 'USDC Escrow Funding'}
                  </CardTitle>
                  <CardDescription>
                    {transactionValidation.isTopUp 
                      ? 'Add more funds to your existing escrow account'
                      : 'Fund your escrow account for instant API payments'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Current USDC Balance Display */}
                  <div className="bg-muted/30 rounded-lg p-3 border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        Current USDC Balance
                      </span>
                      {balanceLoading && (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      )}
                    </div>
                    <div className="mt-1">
                      <span className="text-base font-semibold">
                        {balanceFormatted} USDC
                      </span>
                    </div>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Funding Amount:</span>
                      <span className="font-semibold">{usdcAmount} USDC</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Estimated API Calls:</span>
                      <span className="font-semibold">{(parseFloat(usdcAmount) / 0.001).toLocaleString()} calls</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Network:</span>
                      <span className="font-semibold">Base Sepolia</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Server Address:</span>
                      <span className="font-semibold font-mono text-xs">
                        {effectiveServerAddress.slice(0, 8)}...{effectiveServerAddress.slice(-6)}
                      </span>
                    </div>
                  </div>

                  {/* Circle Transaction Component */}
                  <Button
                    onClick={handleCircleTransaction}
                    disabled={!usdcAmount || !address || !isConnected || !transactionValidation.isValid || transactionLoading}
                    className="w-full"
                  >
                    {transactionLoading ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                        {transactionStatus === 'pending' ? 'Processing...' : (transactionValidation.isTopUp ? 'Top Up Escrow' : 'Fund Escrow with USDC')}
                      </>
                    ) : (
                      transactionValidation.isTopUp 
                        ? 'Top Up Existing Escrow (Pay Gas with USDC)'
                        : 'Create New Escrow (Pay Gas with USDC)'
                    )}
                  </Button>

                  {/* Escrow Status Display */}
                  {escrowStatusLoading && (
                    <Alert>
                      <AlertDescription>
                        Checking existing escrow status...
                      </AlertDescription>
                    </Alert>
                  )}

                  {escrowStatusError && (
                    <Alert variant="destructive">
                      <AlertDescription>
                        Error checking escrow status: {escrowStatusError}
                      </AlertDescription>
                    </Alert>
                  )}

                  {isEscrowOpen === true && (
                    <Alert className="border-blue-200 bg-blue-50">
                      <AlertDescription className="text-blue-700">
                        <div className="space-y-2">
                          <div>ℹ️ Escrow account found for this server</div>
                          <div className="text-sm">
                            Escrow Address: <span className="font-mono text-xs">{escrowAddress}</span>
                          </div>
                          <div className="text-sm">
                            Current Balance: {escrowBalanceLoading ? (
                              <span className="inline-flex items-center gap-1">
                                <div className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
                                Loading...
                              </span>
                            ) : (
                              <span className="font-medium">{formatUnits(escrowBalance || BigInt(0), 6)} USDC</span>
                            )}
                          </div>
                          <div className="text-sm">
                            You can add more funds to the existing escrow account. This will require only 1 transaction instead of 2.
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Transaction Status Display */}
                  {transactionStatus === 'pending' && (
                    <Alert>
                      <AlertDescription>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            <span>Processing {transactionValidation.isTopUp ? 'top-up' : 'escrow creation'}...</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {transactionValidation.isTopUp ? (
                              <>
                                You will need to sign 1 transaction:
                                <br />• Transfer USDC to escrow account
                              </>
                            ) : (
                              <>
                                You will need to sign 2 transactions:
                                <br />1. Approve USDC spending
                                <br />2. Open escrow account
                              </>
                            )}
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {transactionStatus === 'success' && (
                    <Alert className="border-green-200 bg-green-50">
                      <AlertDescription className="text-green-700">
                        ✅ {transactionValidation.isTopUp 
                          ? `Escrow topped up successfully! Added ${usdcAmount} USDC to your existing escrow.`
                          : 'Escrow created and funded successfully!'
                        } Your balance should update shortly.
                      </AlertDescription>
                    </Alert>
                  )}

                  {transactionStatus === 'error' && (
                    <Alert variant="destructive">
                      <AlertDescription>
                        <div className="space-y-2">
                          <div>❌ Transaction failed. Please try again.</div>
                          <div className="text-sm">
                            Common issues:
                            <br />• Make sure you have enough ETH for gas fees
                            <br />• Ensure you approve both wallet prompts
                            <br />• Check your USDC balance is sufficient
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Balance Validation Alerts */}
                  {isConnected && transactionValidation.error && (
                    <Alert variant="destructive">
                      <AlertDescription>
                        {transactionValidation.error === 'Insufficient USDC balance' ? (
                          <div className="space-y-2">
                            <div>Insufficient USDC balance for this transaction.</div>
                            <div className="text-sm">
                              Required: {formatUnits(transactionValidation.requiredAmount, 6)} USDC
                            </div>
                            <div className="text-sm">
                              Current: {formatUnits(transactionValidation.currentBalance || BigInt(0), 6)} USDC
                            </div>
                            <div className="text-sm">
                              Shortfall: {formatUnits(transactionValidation.shortfall || BigInt(0), 6)} USDC
                            </div>
                            <div className="text-sm mt-2 font-medium">
                              Use the Fiat tab to buy USDC with Coinbase, or transfer USDC to your wallet.
                            </div>
                          </div>
                        ) : (
                          transactionValidation.error
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Connection Status */}
                  {!isConnected && (
                    <Alert variant="destructive">
                      <AlertDescription>
                        Please connect your wallet to fund escrow account
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
                      <span className="text-muted-foreground">Estimated API Calls:</span>
                      <span className="font-semibold">{(parseFloat(usdcAmount) / 0.001).toLocaleString()} calls</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Destination:</span>
                      <span className="font-semibold font-mono text-xs">
                        {address ? `${address.slice(0, 8)}...${address.slice(-6)}` : 'Not connected'}
                      </span>
                    </div>
                  </div>

                  {/* Coinbase Onramp Button */}
                  {isConnected ? (
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
