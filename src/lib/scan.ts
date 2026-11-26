/**
 * Rasmdan o'qilgan matn: kamera ekrani natijani shu yerga qo'yadi,
 * «So'z qo'shish → Rasm» bo'limi qaytganda uni oladi (uzun matnni URL orqali uzatmaslik uchun).
 */
export interface ScanResult {
  id: number;
  uri: string;
  /** Tanlangan bo'laklar, xatboshilar bo'sh qator bilan ajratilgan */
  text?: string;
  words?: number;
  /** Rasmda matn topilmadi */
  empty?: boolean;
}

let pending: ScanResult | null = null;

export function putScan(r: Omit<ScanResult, 'id'>) {
  pending = { ...r, id: Date.now() };
}

/** Natijani bir marta oladi (keyin o'chadi). */
export function takeScan(): ScanResult | null {
  const r = pending;
  pending = null;
  return r;
}

/** ML Kit bo'laklarini tozalaydi: bo'sh, faqat raqam yoki belgidan iborat bo'laklar tashlanadi. */
export function cleanBlocks(raw: string[]): { text: string; words: number; on: boolean }[] {
  return raw
    .map((t) => t.replace(/-\n(?=[a-z])/g, '').replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((t) => /[A-Za-z]{2,}/.test(t))
    .map((text) => {
      const words = (text.match(/[A-Za-z][A-Za-z'’-]*/g) ?? []).length;
      // Sarlavha, bet raqami, kolontitul — odatda 1–3 so'z: oldindan belgilanmaydi
      return { text, words, on: words >= 4 };
    });
}
