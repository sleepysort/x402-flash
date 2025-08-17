import { useBalance, useAccount, useChainId } from 'wagmi'
import { getUSDCAddress } from '@/lib/circle-paymaster'

interface UseUSDCBalanceReturn {
  balance: bigint | undefined
  balanceFormatted: string
  loading: boolean
  error: Error | null
  refetch: () => void
  hasMinimumBalance: (amount: bigint) => boolean
}

export function useUSDCBalance(): UseUSDCBalanceReturn {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  
  const { 
    data: balance, 
    isLoading: loading, 
    error, 
    refetch 
  } = useBalance({
    address: address as `0x${string}`,
    token: getUSDCAddress(chainId),
    query: {
      enabled: isConnected && !!address,
    }
  })

  // Format balance for display (USDC has 6 decimals)
  const balanceFormatted = balance 
    ? (Number(balance.value) / 1e6).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 6
      })
    : '0.00'

  // Check if user has minimum required balance
  const hasMinimumBalance = (requiredAmount: bigint): boolean => {
    if (!balance?.value) return false
    return balance.value >= requiredAmount
  }

  return {
    balance: balance?.value,
    balanceFormatted,
    loading,
    error,
    refetch,
    hasMinimumBalance,
  }
}
