'use client';

import { useMemo } from 'react';

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
import { Server, Wallet, Clock, DollarSign } from 'lucide-react';

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

  const handleOpenEscrow = () => {
    // TODO: Implement escrow opening logic
    console.log('Opening escrow for:', shopItem?.name);
  };

  const formatPrice = (price: number) => {
    return `$${price.toFixed(6)}`;
  };

  const getEscrowStatusBadge = (opened: boolean) => {
    return opened ? (
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
                {getEscrowStatusBadge(shopItem.escrowAccountOpened)}
              </div>
            </CardContent>
          </Card>

          {/* Open Escrow Button */}
          <div className="flex justify-center">
            <Button 
              onClick={handleOpenEscrow}
              className="w-full max-w-md"
              size="lg"
            >
              Open Escrow
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
