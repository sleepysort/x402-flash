import { useCallback } from 'react'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import { Address, encodeFunctionData, parseUnits } from 'viem'
import { getCirclePaymasterAddress, getUSDCAddress } from '@/lib/circle-paymaster'

const PERMIT_TYPEHASH = '0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9'

export function useCirclePaymaster() {
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()

  const signUSDCPermit = useCallback(async (
    spenderAddress: Address,
    amount: bigint,
    deadline: bigint
  ) => {
    if (!address || !walletClient || !publicClient) {
      throw new Error('Wallet not connected')
    }

    const chainId = publicClient.chain?.id
    if (!chainId) throw new Error('Chain ID not available')

    const usdcAddress = getUSDCAddress(chainId)
    
    const nonce = await publicClient.readContract({
      address: usdcAddress,
      abi: [
        {
          name: 'nonces',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: 'owner', type: 'address' }],
          outputs: [{ name: '', type: 'uint256' }],
        },
      ],
      functionName: 'nonces',
      args: [address],
    })

    const domain = {
      name: 'USD Coin',
      version: '2',
      chainId,
      verifyingContract: usdcAddress,
    }

    const types = {
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    }

    const message = {
      owner: address,
      spender: spenderAddress,
      value: amount,
      nonce,
      deadline,
    }

    const signature = await walletClient.signTypedData({
      domain,
      types,
      primaryType: 'Permit',
      message,
    })

    return {
      signature,
      nonce,
      deadline,
      amount,
    }
  }, [address, walletClient, publicClient])

  const estimateGasInUSDC = useCallback(async (gasEstimate: bigint): Promise<bigint> => {
    if (!publicClient) throw new Error('Public client not available')

    const gasPrice = await publicClient.getGasPrice()
    const gasCostInWei = gasEstimate * gasPrice
    
    const ethToUsdcRate = BigInt(3000)
    const gasCostInUSDC = (gasCostInWei * ethToUsdcRate) / parseUnits('1', 18)
    
    return gasCostInUSDC + (gasCostInUSDC * BigInt(10)) / BigInt(100)
  }, [publicClient])

  return {
    
    signUSDCPermit,
    estimateGasInUSDC,
    getPaymasterAddress: getCirclePaymasterAddress,
    getUSDCAddress,
  }
}