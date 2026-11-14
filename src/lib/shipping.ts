/**
 * Ongkir Jabodetabek tahap 1: tabel tarif per zona (diatur admin).
 * Tahap 2 bisa diganti Biteship/RajaOngkir tanpa mengubah pemanggil.
 */
export interface ShippingRate {
  zone: string;
  cities: string[]; // ternormalisasi huruf kecil
  baseFee: number; // 1 kg pertama
  perKgFee: number;
  minDays: number;
  maxDays: number;
}

export interface ShippingInput {
  city: string;
  actualWeightGram: number;
  dims?: { lengthCm: number; widthCm: number; heightCm: number };
  declaredValue: number;
  /** Asuransi dalam basis poin dari nilai barang. Default 20 = 0,2%. */
  insuranceBps?: number;
}

export interface ShippingQuote {
  zone: string;
  chargeableKg: number;
  shippingFee: number;
  insuranceFee: number;
  total: number;
  minDays: number;
  maxDays: number;
}

export class ShippingError extends Error {
  code: "OUT_OF_AREA" | "INVALID_INPUT";
  constructor(code: "OUT_OF_AREA" | "INVALID_INPUT", message: string) {
    super(message);
    this.name = "ShippingError";
    this.code = code;
  }
}

export const JABODETABEK_CITIES = [
  "jakarta pusat",
  "jakarta utara",
  "jakarta barat",
  "jakarta selatan",
  "jakarta timur",
  "bogor",
  "depok",
  "tangerang",
  "tangerang selatan",
  "bekasi",
] as const;

export function normalizeCity(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/\b(?:kota|kabupaten|administrasi)\b|\bkab\b\.?/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function quoteShipping(rates: ShippingRate[], input: ShippingInput): ShippingQuote {
  const { actualWeightGram, dims, declaredValue, insuranceBps = 20 } = input;
  if (!Number.isFinite(actualWeightGram) || actualWeightGram <= 0 || declaredValue < 0) {
    throw new ShippingError("INVALID_INPUT", "Berat atau nilai barang tidak valid");
  }

  const city = normalizeCity(input.city);
  const rate = rates.find((r) => r.cities.includes(city));
  if (!rate) throw new ShippingError("OUT_OF_AREA", "Area di luar jangkauan Jabodetabek");

  // Berat tertagih = yang terbesar antara berat asli dan volumetrik (p*l*t / 6000).
  const volumetricKg = dims ? (dims.lengthCm * dims.widthCm * dims.heightCm) / 6000 : 0;
  const chargeableKg = Math.max(1, Math.ceil(Math.max(actualWeightGram / 1000, volumetricKg)));

  const shippingFee = rate.baseFee + (chargeableKg - 1) * rate.perKgFee;
  const insuranceFee = Math.ceil((declaredValue * insuranceBps) / 10_000);

  return {
    zone: rate.zone,
    chargeableKg,
    shippingFee,
    insuranceFee,
    total: shippingFee + insuranceFee,
    minDays: rate.minDays,
    maxDays: rate.maxDays,
  };
}
