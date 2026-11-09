import { Feather } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Flame } from '@/components/Streak';
import { SnowArt } from '@/components/Art';
import { BackHeader, Screen, T } from '@/components/ui';
import { DAY_GOAL, FREEZE_EVERY, MAX_FREEZES, REPAIR_COOLDOWN } from '@/lib/streak';
import { colors } from '@/lib/theme';

function Rule({ n, icon, title, children }: { n: number; icon: ReactNode; title: string; children: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
      <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>{icon}</View>
      <View style={{ flex: 1, gap: 3 }}>
        <T w="extrabold" size={15}>{n}. {title}</T>
        <T size={14} color={colors.inkSoft} style={{ lineHeight: 20 }}>{children}</T>
      </View>
    </View>
  );
}

export default function StreakHelp() {
  return (
    <Screen>
      <BackHeader title="Streak qanday ishlaydi?" />
      <View style={{ gap: 18, marginTop: 4 }}>
        <Rule n={1} icon={<Flame size={22} />} title="Kun qachon sanaladi">
          {`Kamida ${DAY_GOAL} ta so'z mashq qilsangiz yoki bugungi rejani tugatsangiz. Ilovani shunchaki ochish yetmaydi — muhimi so'zlar.`}
        </Rule>
        <Rule n={2} icon={<SnowArt size={20} />} title="Muzlatish">
          {`Kirmagan kuningizda o'zi ishlatiladi: streak saqlanadi, lekin o'smaydi. Har ${FREEZE_EVERY} kunda 1 ta beriladi, zaxirada ko'pi bilan ${MAX_FREEZES} ta — ya'ni ketma-ket ${MAX_FREEZES} kungacha kirmaslik mumkin.`}
        </Rule>
        <Rule n={3} icon={<Feather name="rotate-ccw" size={20} color={colors.forestText} />} title="Qaytarish">
          {`Muzlatish qolmagan bo'lsa, streak uziladi. Uzilganining ertasiga «Qaytarish»ni tanlab, o'sha kuni va ertasi kuni shug'ullansangiz — streak qaytadi. Bepul, ${REPAIR_COOLDOWN} kunda bir marta.`}
        </Rule>
        <Rule n={4} icon={<Feather name="refresh-cw" size={19} color={colors.inkSoft} />} title="Noldan boshlash">
          {"Qaytarilmasa, keyingi shug'ullangan kuningiz — 1-kun. Rekordingiz saqlanib qoladi."}
        </Rule>
        <Rule n={5} icon={<T w="extrabold" size={13} color={colors.amber}>14</T>} title="Marralar">
          {"3, 7, 14, 30, 60, 100 kun va undan keyin. Har 7 kunlik streak bilan qo'shimcha muzlatish."}
        </Rule>
        <Rule n={6} icon={<Feather name="clock" size={20} color={colors.ink} />} title="Kun qachon tugaydi">
          {"Telefoningiz vaqti bo'yicha, yarim tunda (00:00)."}
        </Rule>
      </View>
      <View style={{ padding: 16, borderRadius: 20, backgroundColor: colors.limeSoft }}>
        <T size={14} color={colors.forestInk} style={{ lineHeight: 20 }}>
          <T w="extrabold" size={14} color={colors.forestInk}>Nega bu muhim? </T>
          So'z o'z vaqtida takrorlanmasa, bir necha kunda yarmi unutiladi. Streak — so'zlaringizni o'z vaqtida takrorlab turishning eng oson yo'li.
        </T>
      </View>
    </Screen>
  );
}
