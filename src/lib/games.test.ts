import { IRREGULAR } from '../data/irregular';
import { formMatches, isRecord } from './games';

describe('games helpers', () => {
  it('accepts either of two valid forms', () => {
    expect(formMatches('learned', 'learnt/learned')).toBe(true);
    expect(formMatches('Learnt ', 'learnt/learned')).toBe(true);
    expect(formMatches('was', 'was/were')).toBe(true);
    expect(formMatches('learn', 'learnt/learned')).toBe(false);
    expect(formMatches('', 'went')).toBe(false);
  });
  it('detects records', () => {
    expect(isRecord(5, undefined)).toBe(true);
    expect(isRecord(0, undefined)).toBe(false);
    expect(isRecord(12, 10)).toBe(true);
    expect(isRecord(8, 10, true)).toBe(true);
    expect(isRecord(10, 10, true)).toBe(false);
  });
  it('has a clean irregular verb list', () => {
    expect(IRREGULAR.length).toBeGreaterThanOrEqual(80);
    expect(new Set(IRREGULAR.map((v) => v[0])).size).toBe(IRREGULAR.length);
    for (const v of IRREGULAR) expect(v.every((x) => x.trim().length > 0)).toBe(true);
  });
});
