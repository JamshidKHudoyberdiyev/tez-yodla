/**
 * Ilovadagi tayyor to'plamlar.
 *
 * `association` — o'zbekcha tovush o'xshashligiga asoslangan eslatma (kalit so'z usuli).
 * Faqat haqiqatan o'xshash va tushunarli bo'lganlariga yozilgan; qolgan so'zlarga
 * foydalanuvchi o'z assotsiatsiyasini yozadi (o'zi o'ylab topgan narsa yaxshiroq esda qoladi).
 * Barcha assotsiatsiyalar chiqarishdan oldin til mutaxassisi tomonidan tekshirilishi kerak (docs/PRD.md).
 */

import { CORE_ENTRIES } from './core';
import { FAMILY, SCHOOL, TRAVEL, WORK } from './topics';

export type Level = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

export interface Word {
  id: string;
  word: string;
  translation: string;
  ipa?: string;
  pos?: string;
  example?: string;
  exampleUz?: string;
  association?: string;
  /** Assotsiatsiyadagi o'xshash o'zbekcha bo'lak, masalan "ber" */
  soundsLike?: string;
  level?: Level;
  deckId: string;
  /** Foydalanuvchi qo'shgan so'zda: qayerdan olingani */
  source?: string;
  /** Kartochkadagi rasm (Unsplash) — muallif nomi albatta ko'rsatiladi */
  image?: WordImage;
}

export interface WordImage {
  url: string;
  thumb: string;
  author: string;
  authorUrl: string;
  /** Unsplash sahifasi */
  link: string;
  /** Rasmning asosiy rangi — yuklanguncha fon */
  color?: string;
}

export interface Deck {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  tint: string;
  ink: string;
  custom?: boolean;
  /** «Mavzular» bo'limidagi to'plam (oshxona, maktab, ...) — aks holda daraja bo'yicha to'plam */
  topic?: boolean;
  /** Mavzu ikonkasi — MaterialCommunityIcons nomi */
  icon?: string;
}

export const DECKS: Deck[] = [
  { id: 'core', title: "1000 asosiy so'z", subtitle: "A1–A2 · eng ko'p ishlatiladigan", badge: '1K', tint: '#E6F4CC', ink: '#17461F' },
  { id: 'b1', title: 'CEFR B1', subtitle: "O'rta daraja", badge: 'B1', tint: '#F1E8FB', ink: '#6B3FA8' },
  { id: 'ielts', title: 'IELTS Academic', subtitle: "B2–C1 · akademik so'zlar", badge: 'IE', tint: '#E4EDFB', ink: '#1F55A8' },
  { id: 'kitchen', title: 'Oshxona va ovqat', subtitle: 'A2', badge: 'OV', tint: '#F6EAD7', ink: '#8F4A12', topic: true, icon: 'pot-steam' },
  { id: 'school', title: "Maktab va ta'lim", subtitle: 'A1–A2', badge: 'MT', tint: '#E4EDFB', ink: '#1F55A8', topic: true, icon: 'school' },
  { id: 'work', title: 'Ish va ofis', subtitle: 'A2–B1', badge: 'IS', tint: '#F1E8FB', ink: '#6B3FA8', topic: true, icon: 'briefcase' },
  { id: 'travel', title: 'Sayohat', subtitle: 'A1–B1', badge: 'SY', tint: '#DDF1F2', ink: '#14707A', topic: true, icon: 'airplane' },
  { id: 'family', title: "Oila va do'stlar", subtitle: 'A1–A2', badge: 'OL', tint: '#FBE4EC', ink: '#B02F5C', topic: true, icon: 'account-group' },
  { id: 'mine', title: "Mening so'zlarim", subtitle: "O'qiganlaringizdan saqlangan", badge: '★', tint: '#1F5A2E', ink: '#B6E44E', custom: true },
];

const w = (deckId: string, level: Level, list: Omit<Word, 'id' | 'deckId' | 'level'>[]): Word[] =>
  list.map((x) => ({ ...x, id: `${deckId}:${x.word}`, deckId, level }));

/** 1000 asosiy so'z: birinchi yarmi A1, ikkinchi yarmi A2 (chastota tartibida). */
const CORE_WORDS: Word[] = CORE_ENTRIES.map((e, i) => ({ ...e, id: `core:${e.word}`, deckId: 'core', level: i < 500 ? 'A1' : 'A2' }));

export const WORDS: Word[] = [
  ...CORE_WORDS,
  ...SCHOOL,
  ...WORK,
  ...TRAVEL,
  ...FAMILY,
  ...w('b1', 'B1', [
    { word: 'although', translation: 'garchi, ...ga qaramay', ipa: '/ɔːlˈðəʊ/', pos: "bog'lovchi", example: 'Although it was cold, we went out.', exampleUz: 'Sovuq bo\'lishiga qaramay, tashqariga chiqdik.' },
    { word: 'improve', translation: 'yaxshilamoq', ipa: '/ɪmˈpruːv/', pos: "fe'l", example: 'I want to improve my English.', exampleUz: 'Ingliz tilimni yaxshilamoqchiman.' },
    { word: 'achieve', translation: "erishmoq", ipa: '/əˈtʃiːv/', pos: "fe'l", example: 'She achieved her goal.', exampleUz: 'U maqsadiga erishdi.' },
    { word: 'wise', translation: 'dono', ipa: '/waɪz/', pos: 'sifat', example: 'My grandfather is a wise man.', exampleUz: 'Bobom dono odam.', soundsLike: 'voiz', association: "Dono voiz masjidda odamlarga nasihat qilyapti." },
    { word: 'pale', translation: 'rangpar, oqargan', ipa: '/peɪl/', pos: 'sifat', example: 'You look pale. Are you ill?', exampleUz: "Rangingiz oqarib ketibdi. Kasalmisiz?", soundsLike: 'peyl', association: "Peyli buzilgan odamning rangi oqarib ketdi." },
    { word: 'sore', translation: "og'riyotgan", ipa: '/sɔː/', pos: 'sifat', example: 'I have a sore throat.', exampleUz: "Tomog'im og'riyapti.", soundsLike: "so'r", association: "Tomog'ingiz og'riyaptimi? Iliq sharbatni sekin so'ring." },
    { word: 'mend', translation: "ta'mirlamoq, yamamoq", ipa: '/mend/', pos: "fe'l", example: 'Fishermen were mending their nets.', exampleUz: "Baliqchilar to'rlarini yamashayotgan edi.", soundsLike: 'men', association: "«Men o'zim yamayman!» — dedi bola yirtiq kurtkasini olib." },
    { word: 'dawn', translation: 'tong', ipa: '/dɔːn/', pos: 'ot', example: 'We left at dawn.', exampleUz: "Biz tong saharda yo'lga chiqdik.", soundsLike: 'don', association: "Tong otishi bilan tovuqlar donlay boshlaydi." },
    { word: 'harbour', translation: 'port, bandargoh', ipa: '/ˈhɑːbə/', pos: 'ot', example: 'The ship stayed in the harbour.', exampleUz: 'Kema portda qoldi.', soundsLike: 'harbiy', association: "Portda harbiy kemalar saf tortib turibdi." },
    { word: 'gaze', translation: 'tikilib qarash', ipa: '/ɡeɪz/', pos: "ot, fe'l", example: "He couldn't take his gaze off the sea.", exampleUz: "U nigohini dengizdan uzolmadi.", soundsLike: 'gaz', association: "Gaz plitasidagi ko'k olovga tikilib qolding." },
    { word: 'doubt', translation: 'shubha', ipa: '/daʊt/', pos: "ot, fe'l", example: 'I have no doubt about it.', exampleUz: "Bunga hech shubham yo'q." },
    { word: 'behaviour', translation: 'xulq, xatti-harakat', ipa: '/bɪˈheɪvjə/', pos: 'ot', example: 'His behaviour was strange.', exampleUz: "Uning xatti-harakati g'alati edi." },
  ]),
  ...w('ielts', 'B2', [
    { word: 'thorough', translation: 'puxta, sinchkov', ipa: '/ˈθʌrə/', pos: 'sifat', example: 'The doctor did a thorough check.', exampleUz: "Shifokor puxta tekshiruv o'tkazdi.", soundsLike: 'sara', association: "Bozorda eng sara mevalarni puxta tanlab oldi." },
    { word: 'significant', translation: 'muhim, sezilarli', ipa: '/sɪɡˈnɪfɪkənt/', pos: 'sifat', example: 'There was a significant increase in prices.', exampleUz: "Narxlar sezilarli darajada oshdi." },
    { word: 'evidence', translation: 'dalil', ipa: '/ˈevɪdəns/', pos: 'ot', example: 'There is no evidence for this.', exampleUz: "Buning uchun hech qanday dalil yo'q." },
    { word: 'assess', translation: 'baholamoq', ipa: '/əˈses/', pos: "fe'l", example: 'Teachers assess students every term.', exampleUz: "O'qituvchilar har chorakda o'quvchilarni baholaydi.", soundsLike: 'asos', association: "Har bir baho asosli bo'lishi kerak." },
    { word: 'approach', translation: 'yondashuv', ipa: '/əˈprəʊtʃ/', pos: 'ot', example: 'We need a new approach.', exampleUz: 'Bizga yangi yondashuv kerak.' },
    { word: 'consequence', translation: 'oqibat', ipa: '/ˈkɒnsɪkwəns/', pos: 'ot', example: 'Every action has consequences.', exampleUz: 'Har bir harakatning oqibati bor.' },
    { word: 'decline', translation: 'kamaymoq, pasaymoq', ipa: '/dɪˈklaɪn/', pos: "fe'l", example: 'Sales declined last year.', exampleUz: "O'tgan yili savdo kamaydi." },
    { word: 'crucial', translation: 'hal qiluvchi, juda muhim', ipa: '/ˈkruːʃl/', pos: 'sifat', example: 'Sleep is crucial for memory.', exampleUz: 'Uyqu xotira uchun juda muhim.' },
    { word: 'obtain', translation: "qo'lga kiritmoq, olmoq", ipa: '/əbˈteɪn/', pos: "fe'l", example: 'You must obtain a visa first.', exampleUz: 'Avval viza olishingiz kerak.' },
    { word: 'vast', translation: 'ulkan, keng', ipa: '/vɑːst/', pos: 'sifat', example: 'Uzbekistan has vast deserts.', exampleUz: "O'zbekistonda ulkan cho'llar bor." },
    { word: 'contribute', translation: "hissa qo'shmoq", ipa: '/kənˈtrɪbjuːt/', pos: "fe'l", example: 'Everyone contributed to the project.', exampleUz: "Hamma loyihaga hissa qo'shdi." },
    { word: 'sustainable', translation: 'barqaror', ipa: '/səˈsteɪnəbl/', pos: 'sifat', example: 'We need sustainable energy.', exampleUz: 'Bizga barqaror energiya kerak.' },
  ]),
  ...w('kitchen', 'A2', [
    { word: 'bowl', translation: 'kosa', ipa: '/bəʊl/', pos: 'ot', example: 'She put the soup in a bowl.', exampleUz: "U sho'rvani kosaga soldi.", soundsLike: "bo'l", association: "Onam: «Sho'rvani kosalarga bo'l!» dedi." },
    { word: 'kettle', translation: 'choynak (suv qaynatadigan)', ipa: '/ˈketl/', pos: 'ot', example: 'Put the kettle on, please.', exampleUz: "Iltimos, choynakni qo'yib yuboring.", soundsLike: 'ketdi', association: "Choynak qaynab, suv toshib ketdi!" },
    { word: 'spoon', translation: 'qoshiq', ipa: '/spuːn/', pos: 'ot', example: 'I need a spoon for my soup.', exampleUz: "Sho'rvam uchun qoshiq kerak.", soundsLike: 'sovun', association: "Qoshiqni sovun bilan yuving." },
    { word: 'knife', translation: 'pichoq', ipa: '/naɪf/', pos: 'ot', example: 'Be careful with that knife.', exampleUz: "U pichoq bilan ehtiyot bo'ling." },
    { word: 'pan', translation: 'tova', ipa: '/pæn/', pos: 'ot', example: 'Heat the oil in a pan.', exampleUz: 'Yog\'ni tovada qizdiring.' },
    { word: 'pot', translation: 'qozon, kastryul', ipa: '/pɒt/', pos: 'ot', example: 'Cook the rice in a big pot.', exampleUz: 'Guruchni katta qozonda pishiring.' },
    { word: 'boil', translation: 'qaynatmoq', ipa: '/bɔɪl/', pos: "fe'l", example: 'Boil the water first.', exampleUz: 'Avval suvni qaynating.' },
    { word: 'fry', translation: 'qovurmoq', ipa: '/fraɪ/', pos: "fe'l", example: 'Fry the onions for five minutes.', exampleUz: 'Piyozni besh daqiqa qovuring.' },
    { word: 'pour', translation: 'quymoq', ipa: '/pɔː/', pos: "fe'l", example: 'Pour the milk into the cup.', exampleUz: 'Sutni piyolaga quying.' },
    { word: 'flour', translation: 'un', ipa: '/ˈflaʊə/', pos: 'ot', example: 'We need flour to make bread.', exampleUz: 'Non yopish uchun un kerak.' },
    { word: 'oven', translation: 'pech, duxovka', ipa: '/ˈʌvn/', pos: 'ot', example: 'The bread is in the oven.', exampleUz: 'Non duxovkada.' },
    { word: 'stir', translation: 'aralashtirmoq', ipa: '/stɜː/', pos: "fe'l", example: 'Stir the soup slowly.', exampleUz: "Sho'rvani sekin aralashtiring." },
  ]),
];

/** Daraja testi uchun qo'shimcha oson so'zlar */
export const TEST_WORDS: Word[] = w('test', 'A1', [
  { word: 'water', translation: 'suv' },
  { word: 'house', translation: 'uy' },
  { word: 'green', translation: 'yashil' },
  { word: 'eat', translation: 'yemoq' },
]);

export function deckById(id: string): Deck | undefined {
  return DECKS.find((d) => d.id === id);
}
