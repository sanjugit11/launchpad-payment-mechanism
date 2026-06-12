import { formatUnits, parseUnits } from 'viem'

export function formatCurrency(value: bigint | number, decimals = 18): string {
  if (typeof value === 'number') return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const num = Number(formatUnits(value, decimals))
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function parseCurrency(value: string, decimals = 18): bigint {
  return parseUnits(value, decimals)
}

export function calculateApy(dailyRate = 0.0012): number {
  return ((1 + dailyRate) ** 365 - 1) * 100
}

export function calculateYield(principal: number, days: number): number {
  return principal * 0.0012 * days
}

export function calculateDaysBetween(start: number, end: number): number {
  return Math.floor((end - start) / (1000 * 60 * 60 * 24))
}

export function calculatePenalty(principal: number, daysLocked: number): { penalty: number; userReceives: number; smmReceives: number; yieldAccrued: number } {
  const yieldAccrued = calculateYield(principal, daysLocked)
  const penaltyAmount = principal * 0.10
  const totalForfeited = yieldAccrued + penaltyAmount
  const userReceives = principal - penaltyAmount
  return {
    penalty: totalForfeited,
    userReceives,
    smmReceives: totalForfeited,
    yieldAccrued,
  }
}

export function calculateSxcpFee(amount: number): number {
  return amount * 0.12
}

export function calculateSxepFee(amount: number): number {
  return amount * 0.05
}

export function calculateWithdrawalFee(amount: number): number {
  return amount * 0.06
}

export function calculateSxmmSpread(amount: number): number {
  return amount * 0.05
}

export function calculatePtf(amount: number): number {
  return amount * 0.01
}
