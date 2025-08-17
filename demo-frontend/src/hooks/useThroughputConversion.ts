import { useMemo } from 'react';

export interface ThroughputConversionResult {
  throughputAmount: number;
  conversionRate: number;
  estimatedAPY: number;
  dailyRewards: number;
  isValidAmount: boolean;
}

export interface ThroughputConversionOptions {
  baseRate?: number;
  minimumAmount?: number;
  apyRange?: {
    min: number;
    max: number;
  };
}

/**
 * Hook for calculating throughput conversion from USDC staking
 * Provides pseudo estimates for demonstration purposes
 */
export function useThroughputConversion(
  usdcAmount: string | number,
  options: ThroughputConversionOptions = {}
): ThroughputConversionResult {
  const {
    baseRate = 100, // 1 USDC = 100 throughput units
    minimumAmount = 0.01,
    apyRange = { min: 12, max: 15 }
  } = options;

  return useMemo(() => {
    const amount = typeof usdcAmount === 'string' ? parseFloat(usdcAmount) : usdcAmount;
    
    // Validate amount
    const isValidAmount = !isNaN(amount) && amount >= minimumAmount;
    
    if (!isValidAmount) {
      return {
        throughputAmount: 0,
        conversionRate: baseRate,
        estimatedAPY: 0,
        dailyRewards: 0,
        isValidAmount: false
      };
    }

    // Calculate throughput amount with base rate
    const throughputAmount = amount * baseRate;
    
    // Calculate dynamic APY based on amount (larger amounts get slightly better rates)
    const apyBonus = Math.min(amount / 1000, 0.03); // Max 3% bonus for amounts >= $1000
    const estimatedAPY = apyRange.min + (apyRange.max - apyRange.min) * 0.7 + apyBonus;
    
    // Calculate daily rewards (APY / 365)
    const dailyRewards = (throughputAmount * estimatedAPY / 100) / 365;

    return {
      throughputAmount: Math.floor(throughputAmount), // Round down to whole units
      conversionRate: baseRate,
      estimatedAPY: Number(estimatedAPY.toFixed(2)),
      dailyRewards: Number(dailyRewards.toFixed(2)),
      isValidAmount: true
    };
  }, [usdcAmount, baseRate, minimumAmount, apyRange.min, apyRange.max]);
}
