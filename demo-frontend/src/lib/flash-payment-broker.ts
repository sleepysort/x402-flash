import { Address } from 'viem'

// FlashPaymentBroker contract addresses by chain ID
export const FLASH_PAYMENT_BROKER_ADDRESSES = {
  84532: '0x1598fB0500d16E598C13F97b261025a2DF60BF37' as Address, // Base Sepolia - TODO: Replace with actual deployed address
} as const

// Server configuration for MVP
export const MVP_SERVER_CONFIG = {
  url: '/api/flash-server',
  walletAddress: '0xb4bd6078a915b9d71de4Bc857063DB20dd1ad4A3' as Address,
  apiEndpoint: '?path=/hello/exact',
} as const

export function getFlashPaymentBrokerAddress(chainId: number): Address {
  const address = FLASH_PAYMENT_BROKER_ADDRESSES[chainId as keyof typeof FLASH_PAYMENT_BROKER_ADDRESSES]
  if (!address) {
    throw new Error(`FlashPaymentBroker not deployed on chain ${chainId}`)
  }
  return address
}

export async function validateServerConnection(serverUrl: string, endpoint: string): Promise<boolean> {
  try {
    const response = await fetch(`${serverUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })
    // For flash payment servers, 402 Payment Required is a valid response
    // It indicates the server is running and requires payment
    return response.ok || response.status === 402
  } catch (error) {
    console.error('Server validation failed:', error)
    return false
  }
}
