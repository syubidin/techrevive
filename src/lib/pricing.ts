/**
 * Perhitungan harga jual dari modal + margin. Semua nilai integer rupiah
 * (tanpa float) agar tidak ada selisih pembulatan.
 */
export type MarginType = "PERCENT_BPS" | "FIXED";

export interface PricingInput {
  costPrice: number;
  marginType: MarginType;
  /** PERCENT_BPS: 1200 = 12%. FIXED: rupiah. */
  marginValue: number;
  /** Pembulatan ke atas, default Rp1.000. */
  roundTo?: number;
}

export class PricingError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "PricingError";
    this.code = code;
  }
}

export const MAX_IDR = 2_000_000_000; // batas Int32 Postgres

function assertInt(value: number, name: string, min: number): void {
  if (!Number.isSafeInteger(value) || value < min) {
    throw new PricingError("INVALID_INPUT", `${name} harus bilangan bulat >= ${min}`);
  }
}

export function computeSellPrice(input: PricingInput): number {
  const { costPrice, marginType, marginValue, roundTo = 1000 } = input;
  assertInt(costPrice, "costPrice", 1);
  assertInt(marginValue, "marginValue", 0);
  assertInt(roundTo, "roundTo", 1);

  const margin =
    marginType === "PERCENT_BPS" ? Math.floor((costPrice * marginValue) / 10_000) : marginValue;
  const raw = costPrice + margin;
  const sell = Math.ceil(raw / roundTo) * roundTo;
  if (sell > MAX_IDR) throw new PricingError("OVERFLOW", "Harga melebihi batas maksimum");
  return sell;
}

export interface ProfitResult {
  profit: number;
  /** Margin terhadap harga jual dalam basis poin (818 = 8,18%). */
  marginBps: number;
}

/** extraCosts = ongkir ditanggung toko + biaya gateway + biaya lain. */
export function computeProfit(sellPrice: number, costPrice: number, extraCosts = 0): ProfitResult {
  assertInt(sellPrice, "sellPrice", 1);
  assertInt(costPrice, "costPrice", 0);
  assertInt(extraCosts, "extraCosts", 0);
  const profit = sellPrice - costPrice - extraCosts;
  return { profit, marginBps: Math.round((profit * 10_000) / sellPrice) };
}

/** Pagar agar admin tidak sengaja menjual di bawah margin minimum. */
export function meetsMinimumMargin(sellPrice: number, costPrice: number, minBps: number): boolean {
  return computeProfit(sellPrice, costPrice).marginBps >= minBps;
}
