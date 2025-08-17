import { Address } from 'viem'

// Base Sepolia (Testnet) addresses from Circle documentation
export const CIRCLE_PAYMASTER_ADDRESSES = {
  84532: '0x31BE08D380A21fc740883c0BC434FcFc88740b58' as Address, // Base Sepolia Paymaster v0.7
} as const

export const USDC_ADDRESSES = {
  84532: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address, // Base Sepolia USDC
} as const

export function getCirclePaymasterAddress(chainId: number): Address {
  return CIRCLE_PAYMASTER_ADDRESSES[chainId as keyof typeof CIRCLE_PAYMASTER_ADDRESSES]
}

export function getUSDCAddress(chainId: number): Address {
  return USDC_ADDRESSES[chainId as keyof typeof USDC_ADDRESSES]
}