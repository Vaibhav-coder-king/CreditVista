// SHA-256 hashing for PIN-based local persistence
export async function sha256(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const STORAGE_PREFIX = "credit-vista:result:";

import type { CreditResult, UserProfile, FeatureSet } from "./types";

export interface SavedRecord {
  profile: Pick<UserProfile, "name" | "employment" | "income">;
  features: FeatureSet;
  result: CreditResult;
}

export async function saveResultByPin(pin: string, record: SavedRecord) {
  const key = STORAGE_PREFIX + (await sha256(pin));
  localStorage.setItem(key, JSON.stringify(record));
}

export async function loadResultByPin(pin: string): Promise<SavedRecord | null> {
  const key = STORAGE_PREFIX + (await sha256(pin));
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SavedRecord;
  } catch {
    return null;
  }
}
