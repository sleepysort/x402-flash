'use client';

import { useState } from 'react';
import { useExportEvmAccount, useEvmAddress } from "@coinbase/cdp-hooks";
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function ExportKey() {
  const { exportEvmAccount } = useExportEvmAccount();
  const { evmAddress } = useEvmAddress();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    if (!evmAddress) {
      setError('Wallet not connected');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { privateKey } = await exportEvmAccount({
        evmAccount: evmAddress
      });

      // Handle the private key securely
      // Copy to clipboard for development purposes
      await navigator.clipboard.writeText(privateKey);
      setMessage("Private key copied to clipboard securely");
      
      // Clear clipboard after 30 seconds for security
      setTimeout(() => {
        navigator.clipboard.writeText('');
      }, 30000);

    } catch (error) {
      console.error("Export failed:", error);
      setError("Failed to export private key");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Button 
          onClick={handleExport}
          disabled={loading || !evmAddress}
          variant="outline"
          size="sm"
        >
          {loading ? 'Exporting...' : '🔐 Export Private Key'}
        </Button>
        
        {!evmAddress && (
          <div className="text-xs text-muted-foreground">
            Connect your wallet to export private key
          </div>
        )}
      </div>

      {message && (
        <Alert>
          <AlertDescription className="text-green-600">
            {message}
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Alert>
        <AlertDescription className="text-xs">
          <div className="font-medium mb-1">⚠️ Security Warning:</div>
          <div className="space-y-1">
            <div>• Private key is used for X402 payments only</div>
            <div>• Key is automatically cleared from clipboard after 30 seconds</div>
            <div>• Never share or log private keys in production</div>
            <div>• This is for development/testing purposes only</div>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
