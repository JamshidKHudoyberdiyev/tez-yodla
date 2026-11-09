import { normalize } from './srs';

/** «learnt/learned» kabi bir nechta to'g'ri shakl — biri yozilsa yetadi. */
export function formMatches(typed: string, expected: string): boolean {
  const t = normalize(typed);
  if (!t) return false;
  return expected.split('/').some((f) => normalize(f) === t) || normalize(expected) === t;
}

/** O'yin natijasini rekord bilan solishtiradi. `lowerIsBetter` — masalan, juftlikda kamroq urinish yaxshi. */
export function isRecord(score: number, best: number | undefined, lowerIsBetter = false): boolean {
  if (best === undefined) return score > 0;
  return lowerIsBetter ? score < best : score > best;
}
