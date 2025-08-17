import { useCallback, useState } from 'react'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { Address, encodeFunctionData } from 'viem'
import { useCirclePaymaster } from './useCirclePaymaster'

interface TransactionParams {
  to: Address
  data: `0x${string}`
  value?: bigint
}

export function useCircleTransaction() {
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const { signUSDCPermit, estimateGasInUSDC, getPaymasterAddress } = useCirclePaymaster()
  const [isLoading, setIsLoading] = useState(false)

  const executeTransaction = useCallback(async (params: TransactionParams) => {
    if (!address || !walletClient || !publicClient) {
      throw new Error('Wallet not connected')
    }

    setIsLoading(true)
    try {
      console.log('🔄 Executing transaction...', {
        to: params.to,
        from: address,
        hasWalletClient: !!walletClient,
        hasPublicClient: !!publicClient
      })
      
      // Ensure we have a proper wallet client that can sign transactions
      if (!walletClient.sendTransaction) {
        throw new Error('Wallet client does not support sending transactions')
      }

      // Send transaction - this SHOULD prompt user for signature
      const hash = await walletClient.sendTransaction({
        to: params.to,
        data: params.data,
        value: params.value || BigInt(0),
        gas: BigInt(300000), // Increased gas limit for safety
        account: address, // Explicitly set the account
      })

      console.log('✅ Transaction submitted:', hash)
      console.log('⏳ Waiting for confirmation...')

      // Wait for confirmation with timeout
      const receipt = await publicClient.waitForTransactionReceipt({ 
        hash,
        timeout: 60_000, // 60 second timeout
      })
      
      console.log('✅ Transaction confirmed:', {
        hash: receipt.transactionHash,
        status: receipt.status,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed
      })

      // Verify transaction was successful
      if (receipt.status !== 'success') {
        throw new Error(`Transaction failed with status: ${receipt.status}`)
      }
      
      return receipt
    } catch (error) {
      console.error('❌ Transaction failed:', error)
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('User rejected')) {
          throw new Error('Transaction was rejected by user')
        } else if (error.message.includes('insufficient funds')) {
          throw new Error('Insufficient ETH for gas fees')
        } else if (error.message.includes('execution reverted')) {
          // Check for specific contract revert reasons
          if (error.message.includes('Escrow already exists')) {
            throw new Error('Escrow account already exists for this server. Please use an existing escrow or close it first.')
          } else if (error.message.includes('Insufficient allowance')) {
            throw new Error('USDC allowance is insufficient. Please approve spending first.')
          } else if (error.message.includes('Token deposit into escrow failed')) {
            throw new Error('Failed to transfer USDC to escrow. Check your USDC balance and allowance.')
          } else {
            throw new Error('Transaction failed on-chain. This may be due to insufficient allowance, existing escrow, or network issues.')
          }
        }
      }
      
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [address, walletClient, publicClient])

  return { executeTransaction, isLoading }
}

function encodePaymasterData(paymasterAddress: Address, permit: { signature: string }): `0x${string}` {
  return `${paymasterAddress}${permit.signature.slice(2)}` as `0x${string}`
}