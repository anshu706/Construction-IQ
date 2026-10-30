/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const USD_TO_INR = 83;

export function usdToInr(usd: number): number {
  return Math.round(usd * USD_TO_INR);
}

export function formatINR(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatINRCompact(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '₹0';
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);

  if (abs >= 10_000_000) {
    const crores = abs / 10_000_000;
    return `${sign}₹${crores >= 10 ? crores.toFixed(1) : crores.toFixed(2)} Cr`;
  }
  if (abs >= 100_000) {
    const lakhs = abs / 100_000;
    return `${sign}₹${lakhs >= 10 ? lakhs.toFixed(1) : lakhs.toFixed(2)} L`;
  }
  if (abs >= 1_000) {
    const thousands = abs / 1_000;
    return `${sign}₹${thousands.toFixed(0)}K`;
  }
  return formatINR(amount);
}
