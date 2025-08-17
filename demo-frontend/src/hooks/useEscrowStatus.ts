import { useState, useEffect, useCallback } from 'react'
import { useAccount, usePublicClient } from 'wagmi'
import { Address } from 'viem'
import { FlashPaymentBrokerABI } from '@/abi/FlashPaymentBroker'
import { getFlashPaymentBrokerAddress, MVP_SERVER_CONFIG } from '@/lib/flash-payment-broker'

interface UseEscrowStatusReturn {
  isEscrowOpen: boolean | null
  escrowAddress: Address | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

interface UseEscrowStatusParams {
  clientAddress?: Address
  serverAddress?: Address
  enabled?: boolean
}

export function useEscrowStatus({
  clientAddress,
  serverAddress,
  enabled = true,
}: UseEscrowStatusParams = {}): UseEscrowStatusReturn {
  const { address: connectedAddress } = useAccount()
  const publicClient = usePublicClient()
  
  const [isEscrowOpen, setIsEscrowOpen] = useState<boolean | null>(null)
  const [escrowAddress, setEscrowAddress] = useState<Address | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Use connected address as default client, MVP server as default server
  const effectiveClientAddress = clientAddress || connectedAddress
  const effectiveServerAddress = serverAddress || MVP_SERVER_CONFIG.walletAddress

  const checkEscrowStatus = useCallback(async (): Promise<void> => {
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
      
      // Call escrowAccounts to get the escrow account address
      const escrowAccountAddress = await publicClient.readContract({
        address: brokerAddress,
        abi: FlashPaymentBrokerABI,
        functionName: 'escrowAccounts',
        args: [effectiveClientAddress, effectiveServerAddress],
      }) as Address

      // Check if escrow exists by seeing if the returned address is not the zero address
      const isOpen = escrowAccountAddress && escrowAccountAddress !== '0x0000000000000000000000000000000000000000'
      
      setIsEscrowOpen(isOpen)
      setEscrowAddress(isOpen ? escrowAccountAddress : null)
    } catch (err) {
      console.error('Error checking escrow status:', err)
      setIsEscrowOpen(false)
      setEscrowAddress(null)
      
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Unknown error occurred while checking escrow status')
      }
    } finally {
      setLoading(false)
    }
  }, [effectiveClientAddress, effectiveServerAddress, publicClient, enabled])

  // Initial check
  useEffect(() => {
    if (enabled && effectiveClientAddress && effectiveServerAddress && publicClient) {
      checkEscrowStatus()
    }
  }, [checkEscrowStatus, enabled])

  // Reset state when addresses change
  useEffect(() => {
    setIsEscrowOpen(null)
    setEscrowAddress(null)
    setError(null)
  }, [effectiveClientAddress, effectiveServerAddress])

  return {
    isEscrowOpen,
    escrowAddress,
    loading,
    error,
    refetch: checkEscrowStatus,
  }
}
