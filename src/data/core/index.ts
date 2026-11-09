import part1 from './part1';
import part2 from './part2';
import part3 from './part3';
import part4 from './part4';
import part5 from './part5';
import part6 from './part6';
import part7 from './part7';
import part8 from './part8';
import { Row } from './types';

/**
 * O'zbekcha tovush o'xshashligiga asoslangan assotsiatsiyalar (kalit so'z usuli).
 * Faqat o'xshashlik aniq eshitiladigan va eslab qolishga haqiqatan yordam beradigan so'zlar uchun.
 * [o'xshash o'zbekcha bo'lak, eslatma]
 */
export const CORE_ASSOCIATIONS: Record<string, [string, string]> = {
  time: ['taym', 'Futbolda birinchi taym vaqti tugadi.'],
  year: ['yer', 'Yer Quyosh atrofini bir yilda aylanib chiqadi.'],
  boy: ['boy', "Boy oilaning o'g'il bolasi."],
  car: ['kar', 'Kar odam mashina signalini eshitmadi.'],
  son: ['son', "O'g'lim sonlarni sanashni o'rgandi."],
  eye: ['ay!', "«Ay!» — ko'zimga chang tushdi."],
  nose: ['nos', 'Burnimga nos hidi urildi.'],
  dog: ["dog'", "It loy oyog'i bilan ko'ylagimga dog' tushirdi."],
  cow: ['kov', 'Sigir tuyog\'i bilan yerni kovlayapti.'],
  sugar: ['shakar', "sugar va «shakar» — bir xil ildizdan."],
  table: ['tabel', "Tabelni stol ustiga qo'ydim."],
  ball: ['ball', "To'pni darvozaga kiritib, ball oldi."],
  bus: ['bas', "Avtobus to'ldi — bas, joy yo'q!"],
  ask: ['askar', "Askar komandiridan ruxsat so'radi."],
  tell: ['telefon', 'Telefonda hammasini aytib berdi.'],
  buy: ['boy', 'Boy odam hamma narsani sotib oladi.'],
  pay: ['pay', "Har kim o'z payini to'ladi."],
  old: ['old', "Qari bobo navbatning oldida turibdi."],
  night: ['nay', 'Cho\'pon tunda nay chaladi.'],
  brother: ['birodar', 'Birodar — akadek yaqin odam.'],
  many: ['meni', "Meni do'stlarim ko'p."],
  bad: ['bad', "«bad» o'zbekchada ham yomon: badjahl, badbashara."],
  bag: ["bog'", "Sumkamni bog'da unutib qoldirdim."],
  box: ['boks', 'Bokschi qutini mushtlab tekisladi.'],
  pull: ['pul', 'Pulni o\'ziga tortib oldi.'],
  fill: ['fil', "Fil xartumi bilan hovuzni suvga to'ldirdi."],
  hair: ['xayr', "Sartarosh sochni olib bo'lib, «xayr» dedi."],
  calm: ['kam', "Kam gapirgan odam xotirjam bo'ladi."],
  shy: ['choy', "Uyatchan qiz mehmonga choy uzatib qizarib ketdi."],
  fear: ['fil', "Katta fil kichik sichqondan qo'rqadi."],
  cough: ['kaft', "Yo'talganda og'zingizni kaftingiz bilan yoping."],
  honey: ['qani', "Ayiq bo'sh idishga qarab: «Qani asal?» deyapti."],
  moon: ['munchoq', "Osmondagi oy katta oq munchoqqa o'xshaydi."],
  bowl: ["bo'l", "Onam: «Sho'rvani kosalarga bo'l!» dedi."],
  spoon: ['sovun', 'Qoshiqni sovun bilan yuving.'],
  kettle: ['ketdi', 'Choynak qaynab, suv toshib ketdi!'],
  wise: ['voiz', 'Dono voiz odamlarga nasihat qilyapti.'],
  dawn: ['don', 'Tong otishi bilan tovuqlar donlay boshlaydi.'],
  pale: ['peyl', 'Peyli buzilgan odamning rangi oqarib ketdi.'],
  hole: ['xol', "Yuzidagi qora xol teshikka o'xshab ko'rinadi."],
};

export type CoreEntry = { word: string; translation: string; pos: string; example: string; exampleUz: string; soundsLike?: string; association?: string };

function build(): { entries: CoreEntry[]; duplicates: string[] } {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  const entries: CoreEntry[] = [];
  const all: Row[] = [...part1, ...part2, ...part3, ...part4, ...part5, ...part6, ...part7, ...part8];
  for (const [word, translation, pos, example, exampleUz] of all) {
    const key = word.toLowerCase();
    if (seen.has(key)) {
      duplicates.push(word);
      continue;
    }
    seen.add(key);
    const a = CORE_ASSOCIATIONS[key];
    entries.push({ word, translation, pos, example, exampleUz, ...(a ? { soundsLike: a[0], association: a[1] } : {}) });
  }
  return { entries, duplicates };
}

const built = build();
export const CORE_ENTRIES = built.entries;
export const CORE_DUPLICATES = built.duplicates;
