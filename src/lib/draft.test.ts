import { activeDraft, draftMinutes, type SessionDraft } from './draft';

const d: SessionDraft = { day: 100, groupIndex: 0, wordIds: ['a', 'b', 'c', 'd', 'e'], step: 'Test', steps: ['Tanishish', 'Eslash', 'Test', 'Moslash', 'Yozish', 'Matn'], wrong: [] };
const all = () => true;

describe('draft', () => {
  test('bugungi va o\'rganilmagan so\'zlar — amal qiladi', () => {
    expect(activeDraft(d, 100, {}, all)).toBe(d);
  });
  test('ertasi kuni — amal qilmaydi', () => {
    expect(activeDraft(d, 101, {}, all)).toBeNull();
  });
  test("so'zlardan biri allaqachon o'rganilgan yoki o'chirilgan — amal qilmaydi", () => {
    expect(activeDraft(d, 100, { c: {} }, all)).toBeNull();
    expect(activeDraft(d, 100, {}, (id) => id !== 'e')).toBeNull();
  });
  test("bosqich ro'yxatda yo'q — amal qilmaydi", () => {
    expect(activeDraft({ ...d, step: 'Matn', steps: ['Tanishish', 'Test'] }, 100, {}, all)).toBeNull();
    expect(activeDraft(null, 100, {}, all)).toBeNull();
  });
  test('qolgan vaqt', () => {
    expect(draftMinutes(d)).toBe(3); // 5 so'z × 0,8 × 4/6 bosqich ≈ 2,7
    expect(draftMinutes({ ...d, step: 'Matn' })).toBe(1);
  });
});
