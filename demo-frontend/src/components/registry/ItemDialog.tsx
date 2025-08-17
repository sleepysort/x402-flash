'use client';

import { useMemo, useState } from 'react';
import { useAccount } from 'wagmi';

// Hooks
import { useEscrowStatus } from '@/hooks/useEscrowStatus';
import { useEscrowBalance } from '@/hooks/useEscrowBalance';

// UI Components
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Server, Wallet, Clock, DollarSign, Loader2, Plus, Settings, ExternalLink } from 'lucide-react';

// Import TopUp component
import { TopUpPopup } from '@/components/topup/TopUpPopup';

// Demo shop item interface - matches Shoplist.tsx
interface ShopItem {
  id: string;
  name: string;
  walletAccount: string;
  escrowAccountOpened: boolean;
  pricePerCall: number;
  nonSettlementLatency: string;
}

interface ItemDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string | null;
}

export function ItemDialog({ isOpen, onOpenChange, itemId }: ItemDialogProps) {
  const { address } = useAccount();
  const [showTopUpDialog, setShowTopUpDialog] = useState(false);
  const [showManageDialog, setShowManageDialog] = useState(false);

  // Demo item data (in real app, this would come from props or API)
  const shopItem: ShopItem | null = useMemo(() => {
    if (!itemId) return null;
    
    // This matches the data from Shoplist.tsx
    const items: ShopItem[] = [
      {
        id: 'demo-server-1',
        name: 'Demo Server',
        walletAccount: '0xb4bd6078a915b9d71de4Bc857063DB20dd1ad4A3',
        escrowAccountOpened: true,
        pricePerCall: 0.001,
        nonSettlementLatency: '50ms'
      }
    ];
    
    return items.find(item => item.id === itemId) || null;
  }, [itemId]);

  // Check real escrow status from the smart contract
  const { 
    isEscrowOpen, 
    escrowAddress, 
    loading: escrowLoading, 
    error: escrowError,
    refetch: refetchEscrowStatus 
  } = useEscrowStatus({
    clientAddress: address,
    serverAddress: shopItem?.walletAccount as `0x${string}`,
    enabled: !!shopItem && !!address && isOpen
  });

  // Get escrow balance if escrow exists
  const { 
    balance: escrowBalance, 
    loading: balanceLoading,
    error: balanceError,
    refetch: refetchBalance
  } = useEscrowBalance({
    clientAddress: address,
    serverAddress: shopItem?.walletAccount as `0x${string}`,
    enabled: !!isEscrowOpen && !!shopItem && !!address && isOpen
  });

  const handleEscrowAction = () => {
    if (isEscrowOpen) {
      // If escrow exists, show management options
      setShowManageDialog(true);
    } else {
      // If no escrow, show top-up dialog to create one
      setShowTopUpDialog(true);
    }
  };

  const formatBalance = (balance: bigint | null) => {
    if (balance === null) return '0.000000';
    // Assuming USDC with 6 decimals
    const balanceNum = Number(balance) / 1e6;
    return balanceNum.toFixed(6);
  };

  const formatPrice = (price: number) => {
    return `$${price.toFixed(6)}`;
  };

  const getEscrowStatusBadge = () => {
    if (escrowLoading) {
      return (
        <Badge variant="outline" className="flex items-center space-x-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Checking...</span>
        </Badge>
      );
    }

    if (escrowError) {
      return (
        <Badge variant="destructive">Error</Badge>
      );
    }

    if (isEscrowOpen === null) {
      return (
        <Badge variant="outline">Unknown</Badge>
      );
    }

    return isEscrowOpen ? (
      <Badge variant="default">Yes</Badge>
    ) : (
      <Badge variant="secondary">No</Badge>
    );
  };

  if (!shopItem) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Server className="h-5 w-5" />
            <span>{shopItem.name}</span>
          </DialogTitle>
          <DialogDescription>
            Configure and open an escrow for this service
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Service Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Service Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center space-x-1">
                    <DollarSign className="h-4 w-4" />
                    <span>Price per Call</span>
                  </Label>
                  <div className="text-lg font-semibold">{formatPrice(shopItem.pricePerCall)}</div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>Latency</span>
                  </Label>
                  <Badge variant="outline">{shopItem.nonSettlementLatency}</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center space-x-1">
                  <Wallet className="h-4 w-4" />
                  <span>Server Wallet</span>
                </Label>
                <div className="font-mono text-sm bg-muted p-2 rounded">{shopItem.walletAccount}</div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Escrow Account Opened</Label>
                {getEscrowStatusBadge()}
              </div>

              {/* Show escrow balance if available */}
              {isEscrowOpen && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Escrow Balance</Label>
                  <div className="flex items-center space-x-2">
                    {balanceLoading ? (
                      <div className="flex items-center space-x-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span className="text-sm">Loading balance...</span>
                      </div>
                    ) : balanceError ? (
                      <Badge variant="destructive">Error loading balance</Badge>
                    ) : (
                      <div className="text-lg font-semibold">${formatBalance(escrowBalance)} USDC</div>
                    )}
                  </div>
                </div>
              )}

              {/* Show escrow address if available */}
              {escrowAddress && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Escrow Account Address</Label>
                  <div className="font-mono text-sm bg-muted p-2 rounded break-all">{escrowAddress}</div>
                </div>
              )}

              {/* Show error message if any */}
              {escrowError && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-destructive">Error</Label>
                  <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">{escrowError}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-center space-x-3">
            <Button 
              onClick={handleEscrowAction}
              className="flex-1 max-w-md"
              size="lg"
              disabled={escrowLoading || !address}
            >
              {isEscrowOpen ? (
                <>
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Escrow
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Open Escrow
                </>
              )}
            </Button>
            
            {/* Refresh button */}
            <Button 
              onClick={refetchEscrowStatus}
              variant="outline"
              size="lg"
              disabled={escrowLoading}
            >
              {escrowLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Refresh'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* TopUp Dialog for opening new escrow */}
      <TopUpPopup 
        isOpen={showTopUpDialog}
        onOpenChange={setShowTopUpDialog}
        usdcAmount="10"
        throughputAmount={100}
        serverAddress={shopItem?.walletAccount}
        onSuccess={() => {
          // Refresh both escrow status and balance after successful funding
          refetchEscrowStatus();
          refetchBalance();
        }}
      />

      {/* Manage Escrow Dialog */}
      <Dialog open={showManageDialog} onOpenChange={setShowManageDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Manage Escrow</span>
            </DialogTitle>
            <DialogDescription>
              Manage your escrow account for {shopItem?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Current Balance */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Current Balance</Label>
                  <div className="text-2xl font-bold">${formatBalance(escrowBalance)} USDC</div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-2">
              <Button 
                onClick={() => {
                  setShowManageDialog(false);
                  setShowTopUpDialog(true);
                }}
                className="w-full"
                variant="default"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add More Funds
              </Button>
              
              <Button 
                onClick={() => {
                  // TODO: Implement close escrow functionality
                  console.log('Close escrow for:', shopItem?.name);
                }}
                className="w-full"
                variant="outline"
              >
                Close Escrow
              </Button>

              <Button 
                onClick={() => {
                  if (escrowAddress) {
                    const blockExplorerUrl = `https://sepolia.basescan.org/address/${escrowAddress}`;
                    window.open(blockExplorerUrl, '_blank', 'noopener,noreferrer');
                  }
                }}
                className="w-full"
                variant="ghost"
                disabled={!escrowAddress}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View on Block Explorer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
