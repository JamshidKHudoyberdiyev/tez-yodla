import { View } from 'react-native';
import { BackHeader, Card, Screen, T } from '@/components/ui';
import { colors } from '@/lib/theme';

const BLOCKS = [
  { t: '1. Tanishish', d: "So'z, talaffuz, tarjima, o'zbekcha assotsiatsiya va misol gap. So'zni 3 marta ovoz chiqarib aytasiz." },
  { t: '2. Eslash', d: "Faqat so'z ko'rinadi. Javobni ochishdan oldin o'zingiz eslashga urinasiz — bu faol eslash, eng kuchli usul." },
  { t: '3. Yozish', d: "Har 5 ta yangi so'zdan keyin har birini xotiradan harfma-harf yozasiz. Xato bo'lsa, to'g'risini qayta yozasiz." },
  { t: 'Takrorlash', d: "So'z 1, 3, 7, 14 va 30 kundan keyin qaytadi — har safar boshqa shaklda: kartochka, yozma, gap ichida, eshitib yozish." },
  { t: 'Unutsangiz', d: "So'z shu kuniyoq qayta yodlashga tushadi (ko'rish → eslash → yozish) va bir bosqich orqaga qaytadi. 4 marta unutilgan so'z «qiyin» deb belgilanadi." },
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
