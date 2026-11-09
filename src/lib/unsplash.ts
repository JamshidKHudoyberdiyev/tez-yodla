import type { WordImage } from '@/data/words';

/**
 * Unsplash: so'zga mos rasm qidirish.
 * Qoidalar (Unsplash API guidelines):
 *  - rasm Unsplash manzilidan to'g'ridan-to'g'ri ko'rsatiladi (hotlink), qayta yuklanmaydi;
 *  - muallif va Unsplash nomi havolalari bilan ko'rsatiladi;
 *  - foydalanuvchi rasmni tanlaganda «download_location» ga so'rov yuboriladi.
 * Kalit .env faylida: EXPO_PUBLIC_UNSPLASH_ACCESS_KEY. Play Market'ga chiqishdan oldin serverga o'tkaziladi.
 */

const KEY = process.env.EXPO_PUBLIC_UNSPLASH_ACCESS_KEY ?? '';

/**
 * Rasm qidirish hozircha O'CHIRILGAN: Unsplash'ning «content_filter=high» filtri uyatli so'rovlarni
 * to'liq to'smaydi. Pullik (Pro) bosqichda server orqali, moderatsiya bilan yoqiladi.
 * Allaqachon tanlangan rasmlar kartochkada ko'rinishda davom etadi.
 */
export const IMAGE_SEARCH_ENABLED = false;

/** Qidirib bo'lmaydigan so'zlar (o'zbekcha va inglizcha); server bosqichida kengaytiriladi. */
const BLOCKED = /\b(sex|sexy|porn\w*|nude|naked|nsfw|xxx|erotic\w*|boob\w*|breast\w*|nipple\w*|penis|vagina|genital\w*|bikini|lingerie|underwear|strip\w*|fetish|hentai|onlyfans|seks\w*|porno\w*|yalang'och\w*|jinsiy)\b/i;
export const isBlockedQuery = (q: string) => BLOCKED.test(q.normalize('NFKC'));
const UTM = 'utm_source=tez_yodla&utm_medium=referral';
const withUtm = (url: string) => `${url}${url.includes('?') ? '&' : '?'}${UTM}`;

export const unsplashEnabled = () => IMAGE_SEARCH_ENABLED && KEY.length > 10;

export interface FoundPhoto extends WordImage {
  id: string;
  downloadLocation: string;
}

interface ApiPhoto {
  id: string;
  color?: string;
  alt_description?: string | null;
  urls: { small: string; regular: string; thumb: string };
  links: { html: string; download_location: string };
  user: { name: string; links: { html: string } };
}

export function parsePhotos(json: unknown): FoundPhoto[] {
  const results = (json as { results?: ApiPhoto[] })?.results;
  if (!Array.isArray(results)) return [];
  return results
    .filter((p) => p?.urls?.small && p.user?.name)
    .map((p) => ({
      id: p.id,
      url: p.urls.regular,
      thumb: p.urls.small,
      color: p.color,
      author: p.user.name,
      authorUrl: withUtm(p.user.links.html),
      link: withUtm(p.links.html),
      downloadLocation: p.links.download_location,
    }));
}

export async function searchPhotos(query: string, page = 1, signal?: AbortSignal): Promise<FoundPhoto[]> {
  if (!unsplashEnabled() || !query.trim() || isBlockedQuery(query)) return [];
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query.trim())}&per_page=6&page=${page}&content_filter=high&orientation=squarish`;
  const res = await fetch(url, { signal, headers: { Authorization: `Client-ID ${KEY}`, 'Accept-Version': 'v1' } });
  if (!res.ok) throw new Error(`unsplash ${res.status}`);
  return parsePhotos(await res.json());
}

/** Unsplash talabi: rasm tanlanganda «yuklab olish» hisobga olinadi. */
export function trackDownload(p: FoundPhoto) {
  if (!unsplashEnabled() || !p.downloadLocation) return;
  fetch(p.downloadLocation, { headers: { Authorization: `Client-ID ${KEY}` } }).catch(() => undefined);
}

export const UNSPLASH_URL = withUtm('https://unsplash.com');

export function toWordImage(p: FoundPhoto): WordImage {
  const { id: _id, downloadLocation: _d, ...img } = p;
  return img;
}
