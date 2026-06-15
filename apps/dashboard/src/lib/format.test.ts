import { describe, it, expect } from 'vitest';
import { formatNumber, formatIdr, formatCredits } from './format.js';

describe('formatNumber', () => {
  it('memberi pemisah ribuan ala id-ID', () => {
    expect(formatNumber(1234567)).toBe('1.234.567');
    expect(formatNumber(1000)).toBe('1.000');
  });

  it('menangani angka kecil tanpa pemisah', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(42)).toBe('42');
  });

  it('mengembalikan "0" untuk nilai kosong / tidak valid', () => {
    expect(formatNumber(null)).toBe('0');
    expect(formatNumber(undefined)).toBe('0');
    expect(formatNumber(Number.NaN)).toBe('0');
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe('0');
  });

  it('menangani angka negatif', () => {
    expect(formatNumber(-1500)).toBe('-1.500');
  });
});

describe('formatIdr', () => {
  it('menambahkan prefix "Rp "', () => {
    expect(formatIdr(50000)).toBe('Rp 50.000');
    expect(formatIdr(0)).toBe('Rp 0');
  });

  it('nilai tidak valid menjadi "Rp 0"', () => {
    expect(formatIdr(null)).toBe('Rp 0');
    expect(formatIdr(undefined)).toBe('Rp 0');
  });
});

describe('formatCredits', () => {
  it('identik dengan formatNumber', () => {
    expect(formatCredits(2500)).toBe('2.500');
    expect(formatCredits(null)).toBe(formatNumber(null));
  });
});
