import { useState, useCallback } from 'react'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import { Address } from 'viem'
import { getFlashPaymentBrokerAddress, MVP_SERVER_CONFIG, validateServerConnection } from '@/lib/flash-payment-broker'
import { getUSDCAddress } from '@/lib/circle-paymaster'

// Import FlashPaymentBroker ABI
import { FlashPaymentBrokerABI } from '@/abi/FlashPaymentBroker'

// ERC20 ABI for approve and allowance functions
const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

interface FlashPaymentBrokerReturn {
  createEscrow: (amount: bigint, tokenAddress?: Address) => Promise<Address>;
  getEscrowAddress: (serverAddress?: Address) => Promise<Address | null>;
  loading: boolean;
  error: string | null;
  serverAddress: Address;
}

export function useFlashPaymentBroker(): FlashPaymentBrokerReturn {
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // MVP: Use hardcoded server address
  const serverAddress = MVP_SERVER_CONFIG.walletAddress

  const validateServer = useCallback(async (): Promise<boolean> => {
    try {
      const isConnected = await validateServerConnection(
        MVP_SERVER_CONFIG.url,
        MVP_SERVER_CONFIG.apiEndpoint
      )
      return isConnected
    } catch (err) {
      setError('Failed to connect to server')
      return false
    }
  }, [])

  const getEscrowAddress = useCallback(async (
    targetServerAddress?: Address
  ): Promise<Address | null> => {
    if (!address || !publicClient) {
      throw new Error('Wallet not connected')
    }

    try {
      const chainId = publicClient.chain?.id
      if (!chainId) throw new Error('Chain ID not available')

      const brokerAddress = getFlashPaymentBrokerAddress(chainId)
      const serverAddr = targetServerAddress || serverAddress

      const escrowAddress = await publicClient.readContract({
        address: brokerAddress,
        abi: FlashPaymentBrokerABI,
        functionName: 'getEscrowAccountAddress',
        args: [address, serverAddr],
      }) as Address

      return escrowAddress
    } catch (err) {
      console.error('Failed to get escrow address:', err)
      return null
    }
  }, [address, publicClient, serverAddress])

  // Add token approval function
  const approveTokens = useCallback(async (
    tokenAddress: Address,
    spenderAddress: Address,
    amount: bigint
  ): Promise<void> => {
    if (!address || !walletClient || !publicClient) {
      throw new Error('Wallet not connected')
    }

    try {
      // Check current allowance
      const currentAllowance = await publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address, spenderAddress],
      }) as bigint

      // If allowance is insufficient, approve the tokens
      if (currentAllowance < amount) {
        console.log(`Approving ${amount.toString()} tokens for ${spenderAddress}`)
        
        const { request } = await publicClient.simulateContract({
          account: address,
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [spenderAddress, amount],
        })

        const hash = await walletClient.writeContract(request)
        await publicClient.waitForTransactionReceipt({ hash })
        
        console.log('Token approval confirmed')
      } else {
        console.log('Sufficient allowance already exists')
      }
    } catch (err) {
      console.error('Failed to approve tokens:', err)
      throw new Error('Token approval failed')
    }
  }, [address, walletClient, publicClient])

  const openEscrow = useCallback(async (
    amount: bigint,
    tokenAddress?: Address
  ): Promise<void> => {
    if (!address || !walletClient || !publicClient) {
      throw new Error('Wallet not connected')
    }

    const chainId = publicClient.chain?.id
    if (!chainId) throw new Error('Chain ID not available')

    const brokerAddress = getFlashPaymentBrokerAddress(chainId)
    const usdcAddress = tokenAddress || getUSDCAddress(chainId)

    try {
      // STEP 1: Approve tokens first
      console.log('Approving USDC tokens for FlashPaymentBroker...')
      await approveTokens(usdcAddress, brokerAddress, amount)

      // STEP 2: Call openEscrow function
      console.log('Calling openEscrow...')
      const { request } = await publicClient.simulateContract({
        account: address,
        address: brokerAddress,
        abi: FlashPaymentBrokerABI,
        functionName: 'openEscrow',
        args: [serverAddress, usdcAddress, amount],
      })

      const hash = await walletClient.writeContract(request)
      
      // Wait for transaction confirmation
      await publicClient.waitForTransactionReceipt({ hash })
      console.log('Escrow opened successfully')
    } catch (err) {
      console.error('Failed to open escrow:', err)
      throw err
    }
  }, [address, walletClient, publicClient, serverAddress, approveTokens])

  const createEscrow = useCallback(async (
    amount: bigint,
    tokenAddress?: Address
  ): Promise<Address> => {
    setLoading(true)
    setError(null)

    try {
      // Step 1: Validate server connection
      const isServerValid = await validateServer()
      if (!isServerValid) {
        throw new Error('Server is not reachable or invalid')
      }

      // Step 2: Check if escrow already exists
      const existingEscrow = await getEscrowAddress()
      if (existingEscrow && existingEscrow !== '0x0000000000000000000000000000000000000000') {
        console.log('Escrow already exists:', existingEscrow)
        return existingEscrow
      }

      // Step 3: Open new escrow
      await openEscrow(amount, tokenAddress)

      // Step 4: Get the newly created escrow address
      const newEscrowAddress = await getEscrowAddress()
      if (!newEscrowAddress || newEscrowAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error('Failed to create escrow account')
      }

      return newEscrowAddress
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [validateServer, getEscrowAddress, openEscrow])

  return {
    createEscrow,
    getEscrowAddress,
    loading,
    error,
    serverAddress,
  }
}