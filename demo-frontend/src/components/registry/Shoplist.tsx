'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Search, Grid3X3, List, Eye, AlertCircle, RefreshCw, Server } from 'lucide-react';

type ViewMode = 'table' | 'grid';

// Demo shop item interface
interface ShopItem {
  id: string;
  name: string;
  description: string;
  pricePerCall: number;
  nonSettlementLatency: string;
  walletAccount: string;
  status: 'active' | 'inactive';
  category: string;
}

interface ShoplistProps {
  onItemClick?: (itemId: string) => void;
}

export function Shoplist({ onItemClick }: ShoplistProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // Demo server data
  const shopItems: ShopItem[] = [
    {
      id: 'demo-server-1',
      name: 'Demo Server',
      description: 'High-performance demonstration server for testing and development purposes',
      pricePerCall: 0.001,
      nonSettlementLatency: '50ms',
      walletAccount: '0x742d35Cc6B...8429EBaF',
      status: 'active',
      category: 'Development'
    }
  ];

  const filteredItems = shopItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    return status === 'active' ? (
      <Badge variant="default">Active</Badge>
    ) : (
      <Badge variant="secondary">Inactive</Badge>
    );
  };

  const formatPrice = (price: number) => {
    return `$${price.toFixed(3)}`;
  };

  const handleItemClick = (itemId: string) => {
    if (onItemClick) {
      onItemClick(itemId);
    }
  };

  const renderTableView = () => (
    <Table className="w-full">
      <TableHeader>
        <TableRow>
          <TableHead className="min-w-[200px]">Service</TableHead>
          <TableHead className="min-w-[300px]">Description</TableHead>
          <TableHead className="min-w-[120px]">Price per Call</TableHead>
          <TableHead className="min-w-[150px]">Non Settlement Latency</TableHead>
          <TableHead className="min-w-[180px]">Wallet Account</TableHead>
          <TableHead className="min-w-[100px]">Status</TableHead>
          <TableHead className="w-[100px] min-w-[100px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredItems.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-8">
              <div className="flex flex-col items-center">
                <Search className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">
                  {shopItems.length === 0 
                    ? "No services available in the shop." 
                    : "No services match your search criteria."
                  }
                </p>
              </div>
            </TableCell>
          </TableRow>
        ) : (
          filteredItems.map((item) => (
            <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleItemClick(item.id)}>
              <TableCell className="min-w-[200px]">
                <div className="flex items-center space-x-2">
                  <Server className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-muted-foreground">{item.category}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="min-w-[300px]">
                <div className="text-sm">{item.description}</div>
              </TableCell>
              <TableCell className="min-w-[120px]">
                <div className="font-medium">{formatPrice(item.pricePerCall)}</div>
              </TableCell>
              <TableCell className="min-w-[150px]">
                <Badge variant="outline">{item.nonSettlementLatency}</Badge>
              </TableCell>
              <TableCell className="min-w-[180px]">
                <div className="font-mono text-sm">{item.walletAccount}</div>
              </TableCell>
              <TableCell className="min-w-[100px]">{getStatusBadge(item.status)}</TableCell>
              <TableCell className="w-[100px] min-w-[100px]" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => handleItemClick(item.id)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View details
                    </DropdownMenuItem>
                    <DropdownMenuItem>Configure service</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600">
                      Remove service
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  const renderGridView = () => {
    if (filteredItems.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Search className="h-12 w-12 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">
            {shopItems.length === 0 
              ? "No services available in the shop." 
              : "No services match your search criteria."
            }
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => (
          <Card key={item.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleItemClick(item.id)}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <Server className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    <CardDescription className="text-sm">{item.category}</CardDescription>
                  </div>
                </div>
                {getStatusBadge(item.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price per Call:</span>
                  <span className="font-medium">{formatPrice(item.pricePerCall)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Latency:</span>
                  <Badge variant="outline" className="text-xs">{item.nonSettlementLatency}</Badge>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="text-muted-foreground text-xs">Wallet Account:</span>
                  <span className="font-mono text-xs break-all">{item.walletAccount}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Service Shop</CardTitle>
              <CardDescription>
                Browse available services and their configurations
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full">
            {viewMode === 'table' ? renderTableView() : renderGridView()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
