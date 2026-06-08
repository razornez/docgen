/**
 * Port waktu — di-inject agar perilaku deterministik & mudah diuji (docs/21).
 * Jangan panggil `Date.now()` langsung di logika bisnis; minta lewat Clock.
 */
export interface Clock {
  /** Waktu sekarang sebagai Date (UTC). */
  now(): Date;
  /** Waktu sekarang dalam epoch milidetik. */
  nowMs(): number;
}
