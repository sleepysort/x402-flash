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
  refetchInterval?: number // in milliseconds
}

export function useEscrowBalance({
  clientAddress,
  serverAddress,
  enabled = true,
  refetchInterval = 5000, // 5 seconds default
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

    setLoading(true)
    setError(null)

    try {
      const chainId = publicClient.chain?.id
      if (!chainId) {
        throw new Error('Chain ID not available')
      }

      const brokerAddress = getFlashPaymentBrokerAddress(chainId)
      
      // First check if escrow account exists
      const escrowAccountAddress = await publicClient.readContract({
        address: brokerAddress,
        abi: FlashPaymentBrokerABI,
        functionName: 'getEscrowAccountAddress',
        args: [effectiveClientAddress, effectiveServerAddress],
      }) as Address

      // If no escrow account exists (address is 0x0), balance is 0
      if (!escrowAccountAddress || escrowAccountAddress === '0x0000000000000000000000000000000000000000') {
        setBalance(BigInt(0))
        return
      }

      // If escrow exists, get the balance
      const escrowBalance = await publicClient.readContract({
        address: brokerAddress,
        abi: FlashPaymentBrokerABI,
        functionName: 'getEscrowTokenBalance',
        args: [effectiveClientAddress, effectiveServerAddress],
      }) as bigint

      setBalance(escrowBalance)
    } catch (err) {
      // Check if this is specifically a "no escrow exists" error
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch escrow balance'
      
      if (errorMessage.includes('reverted') || errorMessage.includes('Escrow does not exist')) {
        // If contract reverts, it likely means no escrow exists, so balance is 0
        setBalance(BigInt(0))
        setError(null) // Clear error since this is expected behavior
      } else {
        setError(errorMessage)
        console.error('Error fetching escrow balance:', err)
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
