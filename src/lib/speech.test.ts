import { slowRate, snapRate, SPEECH_RATES } from './speechRate';

describe('speech rate', () => {
  it('offers video-style speeds with 1× as normal', () => {
    expect([...SPEECH_RATES]).toEqual([0.5, 0.75, 1, 1.2, 1.5, 1.75, 2]);
  });
  it('moves old saved speeds to the nearest step', () => {
    expect(snapRate(0.95)).toBe(1);
    expect(snapRate(0.85)).toBe(0.75);
    expect(snapRate(1.15)).toBe(1.2);
    expect(snapRate(undefined)).toBe(1);
    expect(snapRate(9)).toBe(2);
  });
  it('keeps «slower» clearly slower than normal, whatever the chosen speed', () => {
    expect(slowRate(1)).toBeCloseTo(0.65);
    expect(slowRate(2)).toBeCloseTo(0.65);
    expect(slowRate(0.5)).toBe(0.4);
  });
});
