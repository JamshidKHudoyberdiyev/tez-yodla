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

export interface ScanBlock {
  text: string;
  words: number;
  /** Oldindan belgilanadimi: inglizcha va kamida 4 so'z */
  on: boolean;
  /** 1–3 so'zli yozuv (sarlavha, tugma, bet raqami) — yig'ma qatorga tushadi */
  short: boolean;
}

/**
 * ML Kit bo'laklarini tozalaydi: bo'sh, faqat raqam yoki belgidan iborat bo'laklar tashlanadi.
 * `isEnglish` — so'z inglizchami (lug'atimiz yoki keng tarqalgan so'zlar). So'zlarining yarmidan
 * ko'pi inglizcha bo'lgan bo'lakkina oldindan belgilanadi — o'zbekcha izohlar, aralash yozuvlar emas.
 */
export function cleanBlocks(raw: string[], isEnglish: (word: string) => boolean = () => true): ScanBlock[] {
  return raw
    .map((t) => t.replace(/-\n(?=[a-z])/g, '').replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((t) => /[A-Za-z]{2,}/.test(t))
    .map((text) => {
      const tokens = text.match(/[A-Za-z][A-Za-z'’ʻ-]*/g) ?? [];
      const words = tokens.length;
      const english = tokens.filter((w) => !/[og]['’ʻ]/i.test(w) && isEnglish(w.toLowerCase())).length;
      const short = words < 4;
      // Sarlavha («English Story: Writer Learn English Easy») — so'zlarning ko'pi bosh harfda
      const heading = tokens.filter((w) => /^[A-Z]/.test(w)).length / Math.max(1, words) > 0.6;
      return { text, words, short, on: !short && !heading && english / Math.max(1, words) > 0.5 };
    });
}
