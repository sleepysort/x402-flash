import { useCallback } from 'react'
import { useAccount } from 'wagmi'
import { Address } from 'viem'
import { useCirclePaymaster } from './useCirclePaymaster'

interface TransactionParams {
  to: Address
  data: `0x${string}`
  value?: bigint
}

export function useCircleTransaction() {
  const { address } = useAccount()
  const { signUSDCPermit, estimateGasInUSDC, getPaymasterAddress } = useCirclePaymaster()

  const executeTransaction = useCallback(async (params: TransactionParams) => {
    if (!address) throw new Error('Wallet not connected')

    try {
      const gasEstimate = BigInt(100000)

      const usdcGasAmount = await estimateGasInUSDC(gasEstimate)

      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600)

      const paymasterAddress = getPaymasterAddress(84532) // Base Sepolia

      const permit = await signUSDCPermit(paymasterAddress, usdcGasAmount, deadline)

      const userOp = {
        sender: address,
        nonce: BigInt(0),
        initCode: '0x' as const,
        callData: params.data,
        callGasLimit: gasEstimate,
        verificationGasLimit: BigInt(100000),
        preVerificationGas: BigInt(21000),
        maxFeePerGas: BigInt(1000000000),
        maxPriorityFeePerGas: BigInt(1000000000),
        paymasterAndData: encodePaymasterData(paymasterAddress, permit),
        signature: '0x' as const,
      }

      console.log('UserOperation ready for submission:', userOp)
      
      return userOp
    } catch (error) {
      console.error('Transaction failed:', error)
      throw error
    }
  }, [address, signUSDCPermit, estimateGasInUSDC, getPaymasterAddress])

  return { executeTransaction }
}

function encodePaymasterData(paymasterAddress: Address, permit: { signature: string }): `0x${string}` {
  return `${paymasterAddress}${permit.signature.slice(2)}` as `0x${string}`
}