import { useMemo } from 'react';
import { useEscrowBalance } from './useEscrowBalance';
import { useAccount } from 'wagmi';

export interface ThroughputConversionResult {
  // New primary metrics
  actualThroughput: number; // requests/second using our service
  defaultThroughput: number; // requests/second not using our service
  latencyDecreasePercentage: number; // percentage improvement in latency
  
  // Derived metrics
  escrowBalanceUSD: number; // escrow balance in USD
  isValidEscrow: boolean; // whether escrow has sufficient balance
  
  // Legacy fields for backward compatibility
  throughputAmount: number;
  conversionRate: number;
  estimatedAPY: number;
  dailyRewards: number;
  isValidAmount: boolean;
}

export interface ThroughputConversionOptions {
  // Core pricing parameters
  costPerAPICallUSD?: number; // Cost of single API call in USD
  blockConfirmationTimeSeconds?: number; // Blockchain confirmation time in seconds
  nonSettlementLatencySeconds?: number; // Non-settlement latency in seconds
  
  // Legacy parameters for backward compatibility
  baseRate?: number;
  minimumAmount?: number;
  apyRange?: {
    min: number;
    max: number;
  };
}

/**
 * Hook for calculating real throughput metrics based on escrow balance and API costs
 * Implements actual formulas for throughput calculation with and without flash payment service
 */
export function useThroughputConversion(
  usdcAmount: string | number,
  options: ThroughputConversionOptions = {}
): ThroughputConversionResult {
  const { address, isConnected } = useAccount();
  
  // Extract options with defaults
  const {
    costPerAPICallUSD = 0.001, // Default: $0.001 per API call
    blockConfirmationTimeSeconds = 2, // Default: 2 seconds for Base
    nonSettlementLatencySeconds = 0.1, // Default: 100ms non-settlement latency
    
    // Legacy parameters for backward compatibility
    baseRate = 100,
    minimumAmount = 0.01,
    apyRange = { min: 12, max: 15 }
  } = options;

  // Get actual escrow balance
  const { 
    balance: escrowBalanceWei, 
    loading: escrowLoading, 
    error: escrowError 
  } = useEscrowBalance({
    enabled: isConnected && !!address
  });

  return useMemo(() => {
    // Convert escrow balance from wei to USD (USDC has 6 decimals)
    const escrowBalanceUSD = escrowBalanceWei ? Number(escrowBalanceWei) / 1e6 : 0;
    
    // Input amount for legacy compatibility
    const inputAmount = typeof usdcAmount === 'string' ? parseFloat(usdcAmount) : usdcAmount;
    const isValidAmount = !isNaN(inputAmount) && inputAmount >= minimumAmount;
    
    // Check if escrow has sufficient balance for meaningful throughput
    const isValidEscrow = escrowBalanceUSD >= costPerAPICallUSD;
    
    let actualThroughput = 0;
    let defaultThroughput = 0;
    let latencyDecreasePercentage = 0;
    
    if (isValidEscrow && escrowBalanceUSD > 0) {
      // Formula 1: Throughput using our service
      // throughput = escrow_balance_usd / (cost_per_api_call_usd * block_confirmation_time_seconds)
      actualThroughput = escrowBalanceUSD / (costPerAPICallUSD * blockConfirmationTimeSeconds);
      
      // Formula 2: Default throughput (not using our service)
      // throughput = (non_settlement_latency * escrow_balance_usd) / 
      //              (block_confirmation_time * cost_per_api_call * (block_confirmation_time + non_settlement_latency))
      const denominator = blockConfirmationTimeSeconds * costPerAPICallUSD * 
                         (blockConfirmationTimeSeconds + nonSettlementLatencySeconds);
      defaultThroughput = (nonSettlementLatencySeconds * escrowBalanceUSD) / denominator;
      
      // Calculate latency decrease percentage
      // Latency = 1 / throughput, so lower latency = higher throughput
      if (defaultThroughput > 0) {
        const actualLatency = 1 / actualThroughput;
        const defaultLatency = 1 / defaultThroughput;
        latencyDecreasePercentage = ((defaultLatency - actualLatency) / defaultLatency) * 100;
      }
    }

    // Legacy calculations for backward compatibility
    let legacyThroughputAmount = 0;
    let legacyEstimatedAPY = 0;
    let legacyDailyRewards = 0;

    if (isValidAmount) {
      legacyThroughputAmount = inputAmount * baseRate;
      const apyBonus = Math.min(inputAmount / 1000, 0.03);
      legacyEstimatedAPY = apyRange.min + (apyRange.max - apyRange.min) * 0.7 + apyBonus;
      legacyDailyRewards = (legacyThroughputAmount * legacyEstimatedAPY / 100) / 365;
    }

    return {
      // New primary metrics
      actualThroughput: Number(actualThroughput.toFixed(4)),
      defaultThroughput: Number(defaultThroughput.toFixed(4)),
      latencyDecreasePercentage: Number(Math.max(0, latencyDecreasePercentage).toFixed(2)),
      
      // Derived metrics
      escrowBalanceUSD: Number(escrowBalanceUSD.toFixed(6)),
      isValidEscrow,
      
      // Legacy fields for backward compatibility
      throughputAmount: Math.floor(legacyThroughputAmount),
      conversionRate: baseRate,
      estimatedAPY: Number(legacyEstimatedAPY.toFixed(2)),
      dailyRewards: Number(legacyDailyRewards.toFixed(2)),
      isValidAmount,
    };
  }, [
    escrowBalanceWei,
    usdcAmount,
    costPerAPICallUSD,
    blockConfirmationTimeSeconds,
    nonSettlementLatencySeconds,
    baseRate,
    minimumAmount,
    apyRange.min,
    apyRange.max,
    escrowLoading,
    escrowError
  ]);
}
