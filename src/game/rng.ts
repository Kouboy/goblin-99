/**
 * Deterministic Seeded PRNG (Mulberry32) and seed utilities.
 * Ensures every run, floor, mushroom effect, and narrative pick is reproducible.
 */

export function normalizeSeedString(raw?: string | null): string {
  const cleaned = (raw ?? '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  if (cleaned.length > 0) return cleaned.slice(0, 16);
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = 'GS-';
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function hashStringToUint32(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export class SeededRNG {
  private state: number;

  constructor(seed: string | number) {
    this.state = typeof seed === 'number' ? seed >>> 0 : hashStringToUint32(seed);
    if (this.state === 0) this.state = 0x9e3779b9;
  }

  /** Returns float in [0, 1) */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [min, max] inclusive */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Boolean with given probability */
  chance(p: number): boolean {
    return this.next() < p;
  }

  /** Pick one element from a non-empty array */
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  /** Shuffle a shallow copy of an array */
  shuffle<T>(arr: readonly T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}

export function deriveFloorSeed(runSeed: string, depth: number, attempt = 0): string {
  return `${runSeed}::D${depth}::A${attempt}`;
}
