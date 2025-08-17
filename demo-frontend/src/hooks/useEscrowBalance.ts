import { useState, useEffect, useCallback } from 'react'
import { useAccount, usePublicClient } from 'wagmi'
import { Address } from 'viem'
import { FlashPaymentBrokerABI } from '@/abi/FlashPaymentBroker'
import { getFlashPaymentBrokerAddress, MVP_SERVER_CONFIG } from '@/lib/flash-payment-broker'

interface UseEscrowBalanceReturn {
  balance: bigint | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

interface UseEscrowBalanceParams {
  clientAddress?: Address
  serverAddress?: Address
  enabled?: boolean
  refetchInterval?: number // in milliseconds, set to 0 to disable polling
}

export function useEscrowBalance({
  clientAddress,
  serverAddress,
  enabled = true,
  refetchInterval = 1000, // 10 seconds default (reduced frequency for better performance)
}: UseEscrowBalanceParams = {}): UseEscrowBalanceReturn {
  const { address: connectedAddress } = useAccount()
  const publicClient = usePublicClient()
  
  const [balance, setBalance] = useState<bigint | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Use connected address as default client, MVP server as default server
  const effectiveClientAddress = clientAddress || connectedAddress
  const effectiveServerAddress = serverAddress || MVP_SERVER_CONFIG.walletAddress

  const fetchBalance = useCallback(async (): Promise<void> => {
    if (!effectiveClientAddress || !effectiveServerAddress || !publicClient || !enabled) {
      return
    }

    console.log('🔄 Fetching escrow balance for:', {
      client: effectiveClientAddress,
      server: effectiveServerAddress
    });
    setLoading(true)
    setError(null)

    try {
      const chainId = publicClient.chain?.id
      if (!chainId) {
        throw new Error('Chain ID not available')
      }

      const brokerAddress = getFlashPaymentBrokerAddress(chainId)
      
      // Directly call getEscrowTokenBalance - it will revert if no escrow exists
      const escrowBalance = await publicClient.readContract({
        address: brokerAddress,
        abi: FlashPaymentBrokerABI,
        functionName: 'getEscrowTokenBalance',
        args: [effectiveClientAddress, effectiveServerAddress],
      }) as bigint

      console.log('✅ Escrow balance fetched successfully:', escrowBalance.toString());
      setBalance(escrowBalance)
    } catch (err) {
      // If contract call fails, it's likely because no escrow exists
      // This is expected behavior, so we set balance to 0
      setBalance(BigInt(0))
      setError(null) // Clear error since this is expected behavior
      
      // Only log actual errors (not expected "no escrow" cases)
      if (err instanceof Error) {
        const errorMessage = err.message.toLowerCase()
        const isExpectedError = errorMessage.includes('reverted') || 
                              errorMessage.includes('execution reverted') ||
                              errorMessage.includes('escrow does not exist') ||
                              errorMessage.includes('call exception') ||
                              errorMessage.includes('cannot read properties of undefined')
        
        if (!isExpectedError) {
          setError(err.message)
          console.error('Unexpected error fetching escrow balance:', err)
        }
      }
    } finally {
      setLoading(false)
    }
  }, [effectiveClientAddress, effectiveServerAddress, publicClient, enabled])

  // Initial fetch
  useEffect(() => {
    if (enabled && effectiveClientAddress && effectiveServerAddress && publicClient) {
      fetchBalance()
    }
  }, [fetchBalance, enabled])

  // Set up polling interval
  useEffect(() => {
    if (!enabled || !refetchInterval || refetchInterval <= 0) {
      return
    }

    const interval = setInterval(() => {
      fetchBalance()
    }, refetchInterval)

    return () => clearInterval(interval)
  }, [fetchBalance, enabled, refetchInterval])

  // Reset state when addresses change
  useEffect(() => {
    setBalance(null)
    setError(null)
  }, [effectiveClientAddress, effectiveServerAddress])

  return {
    balance,
    loading,
    error,
    refetch: fetchBalance,
  }
}
