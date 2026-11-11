import type { Word } from '../data/words';

/** Noto'g'ri (qoidaga bo'ysunmaydigan) ko'plik shakllari */
const IRREGULAR: Record<string, string> = {
  child: 'children', man: 'men', woman: 'women', person: 'people', foot: 'feet', tooth: 'teeth', mouse: 'mice',
  goose: 'geese', ox: 'oxen', policeman: 'policemen', fireman: 'firemen', businessman: 'businessmen',
  knife: 'knives', wife: 'wives', life: 'lives', leaf: 'leaves', half: 'halves', shelf: 'shelves', wolf: 'wolves',
  loaf: 'loaves', thief: 'thieves', calf: 'calves', scarf: 'scarves', self: 'selves',
  potato: 'potatoes', tomato: 'tomatoes', hero: 'heroes', echo: 'echoes', mosquito: 'mosquitoes',
  sheep: 'sheep', fish: 'fish', deer: 'deer', series: 'series', species: 'species', crisis: 'crises',
  analysis: 'analyses', phenomenon: 'phenomena', criterion: 'criteria', datum: 'data',
  'way out': 'ways out', 'passer-by': 'passers-by', 'mother-in-law': 'mothers-in-law',
};

/**
 * Sanalmaydigan yoki faqat ko'plikda ishlatiladigan otlar — ko'plik shakli ko'rsatilmaydi
 * («waters», «luggages» kabi xato shakllar chiqmasin).
 */
const NO_PLURAL = new Set([
  'water', 'money', 'rice', 'bread', 'milk', 'tea', 'coffee', 'sugar', 'salt', 'butter', 'meat', 'flour', 'oil', 'juice',
  'soup', 'honey', 'food', 'pepper', 'jam', 'yoghurt', 'yogurt', 'pasta', 'chocolate', 'cheese', 'garlic', 'lettuce',
  'luggage', 'baggage', 'information', 'advice', 'homework', 'housework', 'furniture', 'news', 'music', 'weather',
  'traffic', 'knowledge', 'equipment', 'research', 'health', 'fun', 'love', 'happiness', 'help', 'air', 'snow', 'rain',
  'ice', 'sand', 'electricity', 'petrol', 'rubbish', 'garbage', 'jewellery', 'jewelry', 'clothing', 'education',
  'behaviour', 'behavior', 'progress', 'evidence', 'accommodation', 'transport', 'software', 'hardware', 'english',
  'mathematics', 'maths', 'math', 'physics', 'economics', 'nature', 'peace', 'safety', 'sleep', 'damage', 'pollution',
  'permission', 'patience', 'courage', 'wisdom', 'leisure', 'luck', 'poetry', 'scenery', 'grammar', 'vocabulary',
  'cash', 'gold', 'silver', 'stuff', 'heat', 'weight', 'height', 'width', 'length', 'anger', 'fear', 'trust', 'freedom',
  'violence', 'childhood', 'youth', 'wealth', 'poverty', 'employment', 'unemployment', 'feedback', 'overtime', 'staff',
  'sunshine', 'darkness', 'silence', 'laughter', 'importance', 'success', 'failure', 'fame', 'justice', 'respect',
  'confidence', 'attention', 'hope', 'pride', 'shame', 'friendship', 'marriage', 'divorce', 'tourism', 'sightseeing',
  'nonsense', 'homesickness', 'jet lag', 'parking', 'shopping', 'cooking', 'swimming', 'reading', 'writing', 'spelling',
  'listening', 'speaking', 'housing', 'healthcare', 'insurance', 'cotton', 'wool', 'silk', 'leather', 'plastic', 'steel',
  'scissors', 'trousers', 'jeans', 'shorts', 'pyjamas', 'glasses', 'clothes', 'people', 'police', 'cattle', 'goods',
  'thanks', 'stairs', 'outskirts', 'surroundings', 'belongings', 'earnings', 'savings', 'headphones', 'sunglasses',
  'groceries', 'congratulations', 'relatives', 'grandparents', 'parents', 'twins', 'customs', 'sweets',
  // ko'pincha yagona yoki mavhum ma'noda ishlatiladi
  'work', 'internet', 'blood', 'sun', 'moon', 'earth', 'north', 'south', 'east', 'west', 'middle', 'inside', 'outside',
  'past', 'future', 'energy', 'environment', 'grass', 'hair', 'plov', 'dawn', 'gaze',
]);

/** Ko'plik shaklini oddiy qoidalar bilan hosil qiladi (bitta so'z uchun) */
export function pluralize(noun: string): string {
  const lower = noun.toLowerCase();
  if (IRREGULAR[lower]) return matchCase(noun, IRREGULAR[lower]);
  // So'z birikmasi («boarding pass») — oxirgi so'z ko'plikka o'tadi
  const sp = noun.lastIndexOf(' ');
  if (sp > 0) return noun.slice(0, sp + 1) + pluralize(noun.slice(sp + 1));
  if (/(s|x|z|ch|sh)$/i.test(noun)) return noun + 'es';
  if (/[^aeiou]y$/i.test(noun)) return noun.slice(0, -1) + 'ies';
  return noun + 's';
}

function matchCase(src: string, out: string): string {
  return src[0] === src[0].toUpperCase() ? out[0].toUpperCase() + out.slice(1) : out;
}

/** So'z ot bo'lsa (fe'l ham bo'lishi mumkin) — birinchi turkumi «ot» */
export function isNoun(pos?: string): boolean {
  return !!pos && pos.split(',')[0].trim().toLowerCase() === 'ot';
}

/**
 * Tanishish kartasidagi «ko'plik» belgisi uchun. Ot bo'lmasa, sanalmasa yoki
 * shakli o'zgarmasa — null (belgi chiqmaydi). `word.plural` berilgan bo'lsa — o'sha ishlatiladi.
 */
export function pluralOf(word: Pick<Word, 'word' | 'pos'> & { plural?: string | null }): string | null {
  if (word.plural !== undefined) return word.plural;
  if (!isNoun(word.pos)) return null;
  const w = word.word.trim();
  if (!w || /[^a-zA-Z' -]/.test(w)) return null;
  const lower = w.toLowerCase();
  if (NO_PLURAL.has(lower) || NO_PLURAL.has(lower.split(' ').pop()!)) return null;
  if (w !== lower && !w.includes(' ')) return null; // atoqli ot (London, Monday...)
  const p = pluralize(w);
  return p.toLowerCase() === lower ? null : p;
}
