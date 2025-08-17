import { useState, useCallback } from 'react';

interface OnrampAddress {
  address: string;
  blockchains: string[];
}

interface CreateTokenRequest {
  addresses: OnrampAddress[];
  assets?: string[];
}

interface TokenResponse {
  token: string;
  channel_id: string;
  onrampUrl: string;
}

interface UseCoinbaseOnrampReturn {
  createTokenSession: (request: CreateTokenRequest) => Promise<TokenResponse | null>;
  loading: boolean;
  error: string | null;
}

export function useCoinbaseOnramp(): UseCoinbaseOnrampReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createTokenSession = useCallback(async (request: CreateTokenRequest): Promise<TokenResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/coinbase/onramp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || 'Failed to create session token';
        setError(errorMessage);
        return null;
      }

      return data as TokenResponse;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createTokenSession,
    loading,
    error,
  };
}