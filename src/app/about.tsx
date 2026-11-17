import { View } from 'react-native';
import { BackHeader, Card, Screen, T } from '@/components/ui';
import { colors } from '@/lib/theme';

const BLOCKS = [
  { t: '1. Tanishish', d: "So'z, talaffuz, tarjima, misol gap va (bo'lsa) eslab qolish uchun o'zbekcha assotsiatsiya. So'zni tinglab, ortidan ovoz chiqarib aytasiz." },
  { t: '2. Eslash', d: "Faqat so'z ko'rinadi. Javobni ochishdan oldin o'zingiz eslashga urinasiz — bu faol eslash, eng kuchli usul." },
  { t: '3. Test', d: "So'z tepada, pastda tarjima variantlari. To'g'risini tanlaysiz." },
  { t: '4. Moslash', d: "Guruhdagi 5 ta so'zni tarjimalari bilan juftlaysiz." },
  { t: '5. Yozish', d: "Har bir so'zni xotiradan harfma-harf yozasiz. Qiynalsangiz, «Keyingi harf» yordam beradi." },
  { t: '6. Matn', d: "So'zlar gap ichida keladi: tarjimaga qarab, bo'sh joyga mos so'zni tanlaysiz." },
  { t: 'Takrorlash', d: "So'z 1, 3, 7, 14 va 30 kundan keyin qaytadi — har safar boshqa shaklda: kartochka, yozma, gap ichida, eshitib yozish." },
  { t: 'Unutsangiz', d: "So'z shu kuniyoq qayta yodlashga tushadi va bir bosqich orqaga qaytadi. Ko'p adashgan so'zlaringiz «Xatolarim» bo'limida yig'iladi." },
  { t: 'Yodlangan', d: "30 kunlik takrorlashdan o'tgan so'z yodlangan hisoblanadi va har 3 oyda bir tekshiriladi." },
];

export default function About() {
  return (
    <Screen>
      <BackHeader title="Algoritm qanday ishlaydi" />
      {BLOCKS.map((b) => (
        <Card key={b.t} style={{ gap: 4 }}>
          <T w="extrabold" size={16}>{b.t}</T>
          <T size={14} color={colors.inkSoft}>{b.d}</T>
        </Card>
      ))}
      <View style={{ height: 8 }} />
    </Screen>
  );
}
