/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const EVM_THRESHOLDS = {
  cpi: {
    underBudget: 1.0,  // CPI >= 1.0
    atRisk: 0.95,      // 0.95 <= CPI < 1.0
                       // CPI < 0.95 is Over Budget
  },
  spi: {
    ahead: 1.0,        // SPI >= 1.0
    atRisk: 0.90,      // 0.90 <= SPI < 1.0
                       // SPI < 0.90 is Delayed
  },
} as const;

export type CpiStatus = 'Under budget' | 'At risk' | 'Over budget';
export type SpiStatus = 'Ahead' | 'At risk' | 'Delayed';

export function getCpiStatus(cpi: number | null): CpiStatus | null {
  if (cpi === null) return null;
  if (cpi >= EVM_THRESHOLDS.cpi.underBudget) return 'Under budget';
  if (cpi >= EVM_THRESHOLDS.cpi.atRisk) return 'At risk';
  return 'Over budget';
}

export function getSpiStatus(spi: number | null): SpiStatus | null {
  if (spi === null) return null;
  if (spi >= EVM_THRESHOLDS.spi.ahead) return 'Ahead';
  if (spi >= EVM_THRESHOLDS.spi.atRisk) return 'At risk';
  return 'Delayed';
}

