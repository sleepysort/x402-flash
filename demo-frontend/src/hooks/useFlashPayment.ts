'use client';

import { useState, useCallback } from 'react';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { encodeFunctionData, Hex, parseUnits, Address } from 'viem';
import { getFlashPaymentBrokerAddress, MVP_SERVER_CONFIG, validateServerConnection } from '@/lib/flash-payment-broker';
import { getUSDCAddress } from '@/lib/circle-paymaster';
import { FlashPaymentBrokerABI } from '@/abi/FlashPaymentBroker';

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

interface FlashPaymentOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
}

interface PaymentRequirement {
  maxAmountRequired: string;
  scheme?: string;
  network?: string;
}

interface PaymentInfo {
  accepts?: PaymentRequirement[];
  [key: string]: any;
}

interface FlashPaymentResult {
  success: boolean;
  response?: Response;
  data?: string;
  error?: string;
  timeTaken?: number;
  paymentInfo?: any;
}

export function useFlashPayment() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // MVP: Use hardcoded server address
  const serverAddress = MVP_SERVER_CONFIG.walletAddress;

  // Validate server connection
  const validateServer = useCallback(async (): Promise<boolean> => {
    try {
      const isConnected = await validateServerConnection(
        MVP_SERVER_CONFIG.url,
        MVP_SERVER_CONFIG.apiEndpoint
      );
      return isConnected;
    } catch (err) {
      setError('Failed to connect to server');
      return false;
    }
  }, []);

  // Get escrow address for client-server pair
  const getEscrowAddress = useCallback(async (
    targetServerAddress?: Address
  ): Promise<Address | null> => {
    if (!address || !publicClient) {
      throw new Error('Wallet not connected');
    }

    try {
      const chainId = publicClient.chain?.id;
      if (!chainId) throw new Error('Chain ID not available');

      const brokerAddress = getFlashPaymentBrokerAddress(chainId);
      const serverAddr = targetServerAddress || serverAddress;

      const escrowAddress = await publicClient.readContract({
        address: brokerAddress,
        abi: FlashPaymentBrokerABI,
        functionName: 'getEscrowAccountAddress',
        args: [address, serverAddr],
      }) as Address;

      return escrowAddress;
    } catch (err) {
      console.error('Failed to get escrow address:', err);
      return null;
    }
  }, [address, publicClient, serverAddress]);

  // Approve tokens for spending
  const approveTokens = useCallback(async (
    tokenAddress: Address,
    spenderAddress: Address,
    amount: bigint
  ): Promise<void> => {
    if (!address || !walletClient || !publicClient) {
      throw new Error('Wallet not connected');
    }

    try {
      // Check current allowance
      const currentAllowance = await publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address, spenderAddress],
      }) as bigint;

      // If allowance is insufficient, approve the tokens
      if (currentAllowance < amount) {
        console.log(`Approving ${amount.toString()} tokens for ${spenderAddress}`);
        
        const { request } = await publicClient.simulateContract({
          account: address,
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [spenderAddress, amount],
        });

        const hash = await walletClient.writeContract(request);
        await publicClient.waitForTransactionReceipt({ hash });
        
        console.log('Token approval confirmed');
      } else {
        console.log('Sufficient allowance already exists');
      }
    } catch (err) {
      console.error('Failed to approve tokens:', err);
      throw new Error('Token approval failed');
    }
  }, [address, walletClient, publicClient]);

  // Open escrow account with tokens
  const openEscrow = useCallback(async (
    amount: bigint,
    tokenAddress?: Address
  ): Promise<void> => {
    if (!address || !walletClient || !publicClient) {
      throw new Error('Wallet not connected');
    }

    const chainId = publicClient.chain?.id;
    if (!chainId) throw new Error('Chain ID not available');

    const brokerAddress = getFlashPaymentBrokerAddress(chainId);
    const usdcAddress = tokenAddress || getUSDCAddress(chainId);

    try {
      // STEP 1: Approve tokens first
      console.log('Approving USDC tokens for FlashPaymentBroker...');
      await approveTokens(usdcAddress, brokerAddress, amount);

      // STEP 2: Call openEscrow function
      console.log('Calling openEscrow...');
      const { request } = await publicClient.simulateContract({
        account: address,
        address: brokerAddress,
        abi: FlashPaymentBrokerABI,
        functionName: 'openEscrow',
        args: [serverAddress, usdcAddress, amount],
      });

      const hash = await walletClient.writeContract(request);
      
      // Wait for transaction confirmation
      await publicClient.waitForTransactionReceipt({ hash });
      console.log('Escrow opened successfully');
    } catch (err) {
      console.error('Failed to open escrow:', err);
      throw err;
    }
  }, [address, walletClient, publicClient, serverAddress, approveTokens]);

  // Create escrow (combines validation, checking, and opening)
  const createEscrow = useCallback(async (
    amount: bigint,
    tokenAddress?: Address
  ): Promise<Address> => {
    setLoading(true);
    setError(null);

    try {
      // Step 1: Validate server connection
      const isServerValid = await validateServer();
      if (!isServerValid) {
        throw new Error('Server is not reachable or invalid');
      }

      // Step 2: Check if escrow already exists
      const existingEscrow = await getEscrowAddress();
      if (existingEscrow && existingEscrow !== '0x0000000000000000000000000000000000000000') {
        console.log('Escrow already exists:', existingEscrow);
        return existingEscrow;
      }

      // Step 3: Open new escrow
      await openEscrow(amount, tokenAddress);

      // Step 4: Get the newly created escrow address
      const newEscrowAddress = await getEscrowAddress();
      if (!newEscrowAddress || newEscrowAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error('Failed to create escrow account');
      }

      return newEscrowAddress;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [validateServer, getEscrowAddress, openEscrow]);

  const makeFlashPayment = useCallback(async (
    options: FlashPaymentOptions
  ): Promise<FlashPaymentResult> => {
    if (!address || !walletClient || !publicClient) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);
    
    try {
      const startTime = Date.now();
      
      // Step 0: Check if escrow account exists, create if needed
      let escrowAddress = await getEscrowAddress();
      if (!escrowAddress || escrowAddress === '0x0000000000000000000000000000000000000000') {
        console.log('No escrow account found, creating one...');
        // Create escrow with a default amount (10 USDC)
        const defaultAmount = parseUnits('10', 6); // 10 USDC with 6 decimals
        escrowAddress = await createEscrow(defaultAmount);
        console.log('Created escrow account:', escrowAddress);
      } else {
        console.log('Using existing escrow account:', escrowAddress);
      }
      
      // Step 1: Make initial request (similar to CLI implementation)
      const initialResponse = await fetch(options.url, {
        method: options.method || 'GET',
        headers: {
          'Accept': 'application/json',
          ...options.headers,
        },
      });

      // If not 402, return immediately
      if (initialResponse.status !== 402) {
        const data = await initialResponse.text();
        return {
          success: true,
          response: initialResponse,
          data,
          timeTaken: Date.now() - startTime,
        };
      }

      // Step 2: Handle 402 Payment Required
      const paymentInfo: PaymentInfo = await initialResponse.json();
      const paymentRequirements = paymentInfo.accepts || [];
      
      if (paymentRequirements.length === 0) {
        throw new Error('Received 402 but no payment requirements were provided.');
      }

      const amount = BigInt(parseInt(paymentRequirements[0].maxAmountRequired));

      const chainId = publicClient.chain?.id;
      if (!chainId) throw new Error('Chain ID not available');
      
      const brokerAddress = getFlashPaymentBrokerAddress(chainId);
      const usdcAddress = getUSDCAddress(chainId);

      // Step 3: Approve tokens for this specific payment (CRITICAL: settlePayment requires allowance)
      console.log('Approving USDC tokens for settlement payment...');
      await approveTokens(usdcAddress, brokerAddress, amount);

      // Step 4: Prepare settlement transaction calldata (following CLI pattern exactly)
      const calldata = encodeFunctionData({
        abi: [
          {
            type: "function",
            name: "settlePayment",
            stateMutability: "nonpayable",
            inputs: [
              { name: "to", type: "address" },
              { name: "amount", type: "uint256" },
            ],
            outputs: [],
          },
        ],
        functionName: "settlePayment",
        args: [serverAddress, amount],
      });

      const nonce = await publicClient.getTransactionCount({ address });
      
      // Build transaction exactly like CLI but handle browser wallet limitations
      const tx = {
        to: brokerAddress as Hex,
        data: calldata,
        value: BigInt(0),
        chainId,
        nonce,
        gas: BigInt(70000),
        maxFeePerGas: BigInt(1000000),
        maxPriorityFeePerGas: BigInt(1000000),
        type: "eip1559" as const,
      };

      // Step 4: Let user sign the transaction normally
      // We'll use the wallet's standard signing flow - simulate then execute
      
      console.log('Requesting user to sign settlement transaction...');
      
      // Simulate the transaction first to ensure it will succeed
      const { request } = await publicClient.simulateContract({
        account: address,
        address: brokerAddress,
        abi: [
          {
            type: "function",
            name: "settlePayment",
            stateMutability: "nonpayable",
            inputs: [
              { name: "to", type: "address" },
              { name: "amount", type: "uint256" },
            ],
            outputs: [],
          },
        ],
        functionName: "settlePayment",
        args: [serverAddress, amount],
      });

      // User signs and sends the transaction
      const txHash = await walletClient.writeContract(request);
      
      // Wait for transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      console.log('Settlement transaction confirmed:', txHash);

      // Step 5: Build payment header with the transaction details
      // Following the exact pattern from CLI but with executed transaction proof
      const paymentObj = { 
        x402Version: 1, 
        scheme: "flash", 
        network: "base-sepolia", 
        payload: txHash // Transaction hash as proof of executed payment
      };
      
      // Use browser's btoa for base64 encoding instead of Buffer
      const paymentHeader = btoa(JSON.stringify(paymentObj));

      // Step 6: Make payment request with proof of executed transaction
      const paymentResponse = await fetch(options.url, {
        method: options.method || 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Payment': paymentHeader,
          ...options.headers,
        },
      });

      const responseData = await paymentResponse.text();
      const timeTaken = Date.now() - startTime;

      // Check for payment response header (like CLI)
      const xPaymentResponse = paymentResponse.headers.get("x-payment-response");
      let decodedPaymentResponse = null;
      if (xPaymentResponse) {
        try {
          // Use browser's atob for base64 decoding instead of Buffer
          decodedPaymentResponse = JSON.parse(atob(xPaymentResponse));
          console.log('Payment response:', decodedPaymentResponse);
        } catch (e) {
          console.warn('Failed to decode x-payment-response header');
        }
      }

      return {
        success: paymentResponse.ok,
        response: paymentResponse,
        data: responseData,
        timeTaken,
        paymentInfo: decodedPaymentResponse,
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setLoading(false);
    }
  }, [address, walletClient, publicClient, getEscrowAddress, createEscrow, serverAddress]);

  return {
    makeFlashPayment,
    loading,
    error,
    serverAddress,
    getEscrowAddress,
    createEscrow,
    validateServer,
    approveTokens,
    openEscrow,
  };
}
