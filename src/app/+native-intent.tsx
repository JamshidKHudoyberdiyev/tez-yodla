/**
 * Tashqi havolalar ilovani ochganda: Telegram'dan qaytish (yodla://auth-callback?code=…) kirish ekraniga boradi.
 * Code'ni auth.tsx o'zi o'qiydi (Linking), shu yerda faqat sahifa tanlanadi.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    if (path.includes('auth-callback')) return '/login';
    return path;
  } catch {
    return '/';
  }
}
