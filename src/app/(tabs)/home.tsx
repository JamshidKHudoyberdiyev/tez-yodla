import { Feather } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useMemo, type ReactNode } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Line } from 'react-native-svg';
import { PLANT_IMG, PLANT_RATIO, Ring } from '@/components/Art';
import { StreakCard } from '@/components/Streak';
import { Avatar } from '@/components/Avatar';
import { Button, IconTile, T, type IconName } from '@/components/ui';
import { gardenStages } from '@/lib/garden';
import { capReviews, EVENING_FROM_HOUR, EXTRA_NEW, learnedOn, todayPlan } from '@/lib/plan';
import { useStore } from '@/lib/store';
import { activeDraft, draftMinutes, type SessionDraft } from '@/lib/draft';
import { isDue } from '@/lib/srs';
import { VERBS, verbStatus } from '@/lib/verbs';
import { colors } from '@/lib/theme';

const HERO_BG = require('../../../assets/home/hero-bg.webp');
/** Kitob o'qiyotgan miya (426×440) */
const BRAIN = require('../../../assets/home/brain-sit.webp');
const FLAME = require('../../../assets/home/flame.webp');
const hidden = { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const };

function greeting(d = new Date()) {
  const h = d.getHours();
  if (h < 5 || h >= 22) return 'Xayrli tun,';
  if (h < 11) return 'Xayrli tong,';
  if (h < 17) return 'Xayrli kun,';
  return 'Xayrli kech,';
}

export default function Home() {
  const { state, words, today, streak, repairStreak, dismissBreak, wordById, setDraft } = useStore();
  // Mashg'ulot o'rtada qolgan bo'lsa — asosiy karta o'rnida «Davom ettirish»
  const draft = activeDraft(state.draft, today, state.cards, (id) => !!wordById(id));
  const mistakeCount = Object.keys(state.mistakes).filter((id) => !!wordById(id)).length;
  const plan = todayPlan({ words, cards: state.cards, activeDecks: state.activeDecks, knownLemmas: new Set(state.knownLemmas), dailyNew: state.dailyNew, log: state.log, today });
  // Halqa faqat bugungi YANGI so'zlarni sanaydi; takrorlash alohida kartada.
  const newToday = state.log[today]?.newLearned ?? 0;
  const newLeft = plan.newWords.length;
  const newTotal = newToday + newLeft;
  const newDone = newLeft === 0;
  // Reja bajarilgach — yana nechta yangi so'z bor (to'plamlar tugagan bo'lsa tugma chiqmaydi)
  const more = newDone ? todayPlan({ words, cards: state.cards, activeDecks: state.activeDecks, knownLemmas: new Set(state.knownLemmas), dailyNew: state.dailyNew, extraNew: EXTRA_NEW, log: state.log, today }).newWords.length : 0;
  /** Rejadagi to'plamlarda yangi so'z qolmagan — bugungi maqsadga yetilmagan bo'lsa ham */
  const outOfWords = newDone && !more && newToday < state.dailyNew;
  const newMinutes = Math.max(1, Math.round(newLeft * 0.8));
  // Kunlik takrorlash chegarasi: bugun ko'pi bilan `cap` ta, qolgani navbatda
  const cap = state.prefs.reviewCap;
  const reviewedToday = state.log[today]?.reviewed ?? 0;
  const capped = capReviews(plan.reviews, cap, reviewedToday);
  const reviewsLeft = capped.today.length;
  const queued = capped.queued;
  const moreCount = Math.min(cap, queued);
  const reviewMinutes = Math.max(1, Math.round(reviewsLeft * 0.25));
  // Kechki mustahkamlash: bugun o'rganilgan so'zlar kechqurun bir ko'rib chiqiladi
  const eveningCount = learnedOn(state.cards, today).length;
  const eveningOn = eveningCount > 0 && state.evening?.day !== today && new Date().getHours() >= EVENING_FROM_HOUR;
  const garden = useMemo(() => gardenStages(state.cards, today), [state.cards, today]);
  const gardenTotal = garden.reduce((n, g) => n + g.ids.length, 0);
  // Noto'g'ri fe'llar: takrorlash bo'lsa — shuni, bo'lmasa progress
  const verbsDue = Object.values(state.verbs).filter((c) => isDue(c, today)).length;
  const verbsLearned = VERBS.filter((v) => verbStatus(state.verbs[v.base]) === 'learned').length;
  const verbsLearning = VERBS.filter((v) => verbStatus(state.verbs[v.base]) === 'learning').length;
  const verbsSub = verbsLearned + verbsLearning ? `${verbsLearned + verbsLearning} / ${VERBS.length} o'rganildi` : `${VERBS.length} ta fe'l · guruhlab o'rganing`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 28 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 2 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Profil" onPress={() => router.push('/settings/profile')}>
            <Avatar name={state.name} color={state.prefs.avatarColor} art={state.prefs.avatarArt} photo={state.prefs.avatarPhoto} size={48} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <T size={14} color={colors.inkSoft} style={{ lineHeight: 18 }}>{greeting()}</T>
            <T w="extrabold" size={21} numberOfLines={1} style={{ lineHeight: 27 }}>{state.name || "Do'stim"}</T>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`Streak: ${streak.current} kun`} onPress={() => router.push('/streak')}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingLeft: 12, paddingRight: 16, borderRadius: 22, backgroundColor: colors.surface, opacity: pressed ? 0.85 : 1 })}>
            <Image source={FLAME} {...hidden} style={{ width: 22, height: 26, opacity: streak.todayDone ? 1 : 0.45 }} />
            <T w="extrabold" size={18}>{streak.current}</T>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Sozlamalar" onPress={() => router.push('/settings')} hitSlop={4}
            style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1 })}>
            <Feather name="settings" size={21} color={colors.ink} />
          </Pressable>
        </View>

        {draft ? (
          <ResumeCard draft={draft}
            onResume={() => router.push({ pathname: '/session', params: { resume: '1', ...(draft.deck ? { deck: draft.deck } : {}), ...(draft.extra ? { extra: '1' } : {}) } })}
            onRestart={() => { setDraft(null); router.push({ pathname: '/session', params: draft.deck ? { deck: draft.deck } : draft.extra ? { extra: '1' } : { only: 'new' } }); }} />
        ) : (
        /* Bugungi yangi so'zlar (halqa faqat yangi so'zlarni sanaydi) */
        <Hero mascot={newDone ? 100 : 118}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View accessible accessibilityLabel={`Bugun ${newToday} ta yangi so'z o'rganildi, reja ${newTotal}`} style={{ width: 84, height: 84 }}>
              <Ring size={84} stroke={8} track="rgba(255,255,255,0.22)" value={newDone ? 1 : newToday / Math.max(1, newTotal)} />
              <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                {newDone ? <Feather name={outOfWords && !newToday ? 'layers' : 'check'} size={34} color={colors.lime} /> : (
                  <>
                    <T w="extrabold" size={26} color="#FFFFFF" style={{ lineHeight: 28 }}>{newToday}</T>
                    <T size={12} color="#D4E8D6" style={{ lineHeight: 15 }}>/ {Math.max(newTotal, newToday)}</T>
                  </>
                )}
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <T w="extrabold" size={12} color="#D7F76A" style={{ letterSpacing: 1, textTransform: 'uppercase' }}>
                {outOfWords ? "So'zlar tugadi" : newDone ? 'Reja bajarildi' : "Yangi so'zlar"}
              </T>
              <T w="extrabold" size={19} color="#FFFFFF" style={{ lineHeight: 24, marginTop: 2 }} accessibilityRole="header">
                {outOfWords ? (newToday ? 'Barakalla!' : "Yangi so'z qolmadi") : newDone ? 'Barakalla!' : newToday > 0 ? `Yana ${newLeft} ta so'z` : `${newLeft} ta yangi so'z`}
              </T>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                {!newDone ? <Feather name="clock" size={14} color="#E3F0E4" /> : null}
                <T size={13} color="#E3F0E4" style={{ flexShrink: 1 }}>
                  {outOfWords
                    ? "Rejadagi to'plamlarda yangi so'z qolmadi — yangi mavzu qo'shing"
                    : newDone
                      ? (newToday > state.dailyNew ? `Bugun ${newToday} ta yangi so'z — zo'r!` : `${newToday} ta yangi so'z o'rganildi`)
                      : `~${newMinutes} daqiqa`}
                </T>
              </View>
            </View>
          </View>
          {outOfWords ? (
            <Button title="Mavzu tanlash" icon="layers" style={{ alignSelf: 'flex-start', minWidth: 190 }} onPress={() => router.push('/decks')} />
          ) : newDone ? (
            <View style={{ gap: 10, alignSelf: 'flex-start', minWidth: 206 }}>
              {more ? <Button title={`Yana ${more} ta so'z`} icon="plus" onPress={() => router.push({ pathname: '/session', params: { extra: '1' } })} /> : null}
              <HeroGhost icon="align-left" title="Matndan so'z qo'shish" onPress={() => router.push({ pathname: '/add', params: { tab: 'text' } })} />
            </View>
          ) : (
            <Button title={newToday > 0 ? 'Davom etish' : 'Boshlash'} icon={newToday > 0 ? undefined : 'play'} iconRight={newToday > 0 ? 'arrow-right' : undefined}
              style={{ alignSelf: 'flex-start', minWidth: 172 }} onPress={() => router.push({ pathname: '/session', params: { only: 'new' } })} />
          )}
        </Hero>
        )}

        {eveningOn ? (
          <Row icon="moon"
            tint={colors.nightSoft} accent={colors.night} title="Mustahkamlash"
            sub={`Kechki · bugungi ${eveningCount} ta so'z · ~${Math.max(1, Math.round(eveningCount * 0.15))} daq`}
            label={`Kechki mustahkamlash: bugungi ${eveningCount} ta so'z. Boshlash`} onPress={() => router.push('/evening')} />
        ) : null}

        {/* Takrorlash */}
        {reviewsLeft || verbsDue ? (
          <Row icon="rotate-ccw" tint={colors.blueSoft} accent={colors.blue}
            title="Takrorlash" sub={`${[reviewsLeft ? `${reviewsLeft} ta so'z` : '', verbsDue ? `${verbsDue} ta fe'l` : ''].filter(Boolean).join(' · ')} · ~${reviewMinutes + Math.round(verbsDue * 0.5)} daq${queued ? ` · navbatda yana ${queued} ta` : ''}`}
            label={`Takrorlash: ${reviewsLeft} ta so'z, ${verbsDue} ta fe'l. Boshlash`} onPress={() => router.push({ pathname: '/session', params: { only: 'review' } })} />
        ) : queued ? (
          <Row icon="rotate-ccw" tint={colors.blueSoft} accent={colors.blue}
            title={`${reviewedToday} ta takrorlandi`} sub={`Navbatda yana ${queued} ta`} action={`Yana ${moreCount} ta`}
            label={`Bugungi takrorlash bajarildi. Yana ${moreCount} ta takrorlash`} onPress={() => router.push({ pathname: '/session', params: { only: 'review', more: '1' } })} />
        ) : null}

        {mistakeCount && state.mistakesDoneDay !== today ? (
          <Row icon="alert-circle" tint={colors.peach} accent={colors.error}
            title="Xatolarim" sub={`${mistakeCount} ta so'z · ko'p adashganlaringiz`}
            label={`Xatolarim: ${mistakeCount} ta so'z. Mashq qilish`} onPress={() => router.push('/mistakes')} />
        ) : null}

        {streak.offer ? <StreakCard info={streak} today={today} onRepair={repairStreak} onRestart={dismissBreak} /> : null}

        {/* Noto'g'ri fe'llar */}
        <Row icon="repeat" tint={colors.limeSoft} accent={colors.forestText}
          title="Noto'g'ri fe'llar" sub={verbsSub}
          label={`Noto'g'ri fe'llar: ${verbsSub}`} onPress={() => router.push('/verbs')} />

        {/* So'zlar bog'i */}
        <Pressable accessibilityRole="button" accessibilityLabel={`So'zlar bog'i: ${gardenTotal} ta so'z`} onPress={() => router.push('/garden')}
          style={({ pressed }) => ({ backgroundColor: colors.surface, borderRadius: 24, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10, gap: 10, opacity: pressed ? 0.9 : 1 })}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 4 }}>
            <T w="extrabold" size={18}>So'zlar bog'i</T>
            <T w="extrabold" size={13} color={colors.forestText}>{gardenTotal ? `${gardenTotal} so'z →` : "Birinchi so'zlar shu yerda unadi"}</T>
          </View>
          <View>
            <Svg width="100%" height={4} style={{ position: 'absolute', left: 0, right: 0, top: 58 }} {...hidden}>
              <Line x1="8%" y1={2} x2="92%" y2={2} stroke="#EBC88E" strokeWidth={2.4} strokeDasharray="5 6" />
            </Svg>
            <View style={{ flexDirection: 'row' }}>
              {garden.map((g, i) => {
                const empty = !g.ids.length;
                const ph = [26, 38, 48, 52, 52, 52][i];
                return (
                  <View key={g.key} style={{ flex: 1, alignItems: 'center', gap: 4 }} accessibilityLabel={`${g.title}: ${g.ids.length}`}>
                    <View style={{ width: 52, height: 66, alignItems: 'center', justifyContent: 'flex-end' }}>
                      <View style={{ position: 'absolute', bottom: 0, width: 48, height: 14, borderRadius: 24, backgroundColor: '#F6E3BE' }} />
                      <Image source={PLANT_IMG[i]} {...hidden} resizeMode="contain" style={{ width: ph * PLANT_RATIO[i], height: ph, marginBottom: 7, opacity: empty ? 0.5 : 1 }} />
                      {empty ? (
                        <View style={{ position: 'absolute', bottom: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: '#666B66', borderWidth: 2, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                          <Feather name="lock" size={11} color="#FFFFFF" />
                        </View>
                      ) : null}
                    </View>
                    <T w="extrabold" size={15} color={empty ? colors.faint : colors.ink}>{g.ids.length}</T>
                  </View>
                );
              })}
            </View>
          </View>
        </Pressable>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {([
            { icon: 'book-open-variant', bg: '#E4EDFB', fg: '#1F55A8', label: 'Matndan', href: { pathname: '/add', params: { tab: 'text' } } },
            { icon: 'gamepad-variant-outline', bg: '#F1E8FB', fg: '#6B3FA8', label: "O'yinlar", href: '/games' },
            { icon: 'calendar-blank-outline', bg: '#F6EAD7', fg: '#8F4A12', label: 'Hafta', href: '/weekly' },
          ] as { icon: string; bg: string; fg: string; label: string; href: Href }[]).map((a) => (
            <Pressable key={a.label} accessibilityRole="button" accessibilityLabel={a.label} onPress={() => router.push(a.href)}
              style={({ pressed }) => ({ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 48, paddingHorizontal: 6, borderRadius: 18, backgroundColor: colors.surface, opacity: pressed ? 0.85 : 1 })}>
              <IconTile mdi={a.icon} bg={a.bg} fg={a.fg} size={28} />
              <T w="extrabold" size={14} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ flexShrink: 1 }}>{a.label}</T>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Yashil karta: ChatGPT chizgan fon (tepalik, butalar) va kitob o'qiyotgan miya. */
function Hero({ children, mascot = 142 }: { children: ReactNode; mascot?: number }) {
  return (
    <View style={{ backgroundColor: colors.forest, borderRadius: 30, overflow: 'hidden', paddingHorizontal: 18, paddingTop: 22, paddingBottom: 20, gap: 16 }}>
      <Image source={HERO_BG} resizeMode="cover" {...hidden} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} />
      <Image source={BRAIN} {...hidden} style={{ position: 'absolute', right: 0, bottom: 6, height: mascot, width: (mascot * 426) / 440 }} />
      {children}
    </View>
  );
}

/** Yashil karta ichidagi ikkinchi darajali tugma: shaffof, oq chegarali */
function HeroGhost({ icon, title, onPress }: { icon: IconName; title: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} hitSlop={4}
      style={({ pressed }) => ({ height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)', backgroundColor: 'rgba(14,52,24,0.45)',
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16, opacity: pressed ? 0.85 : 1 })}>
      <Feather name={icon} size={17} color="#FFFFFF" />
      <T w="extrabold" size={15} color="#FFFFFF" numberOfLines={1}>{title}</T>
    </Pressable>
  );
}

/** To'xtatilgan mashg'ulot: qaysi guruh va bosqichda qolgani, «Davom ettirish». */
function ResumeCard({ draft, onResume, onRestart }: { draft: SessionDraft; onResume: () => void; onRestart: () => void }) {
  const at = draft.steps.indexOf(draft.step);
  return (
    <Hero mascot={96}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.lime }} />
        <T w="extrabold" size={12} color="#D7F76A" style={{ letterSpacing: 1, textTransform: 'uppercase' }}>To'xtatilgan mashg'ulot</T>
      </View>
      <View style={{ gap: 4, marginTop: -6 }}>
        <T w="extrabold" size={20} color="#FFFFFF" style={{ lineHeight: 26 }} accessibilityRole="header">{draft.groupIndex + 1}-guruh · {draft.step}</T>
        <T size={13} color="#E3F0E4">{draft.wordIds.length} ta yangi so'z · ~{draftMinutes(draft)} daqiqa qoldi</T>
      </View>
      <View accessible accessibilityLabel={`${draft.steps.length} bosqichdan ${at + 1}-bosqich: ${draft.step}`} style={{ gap: 6, maxWidth: 230 }}>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {draft.steps.map((s, i) => <View key={s} style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: i < at ? colors.lime : i === at ? 'rgba(198,245,66,0.5)' : 'rgba(255,255,255,0.22)' }} />)}
        </View>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {draft.steps.map((s, i) => <T key={s} w={i === at ? 'extrabold' : 'medium'} size={10} numberOfLines={1} color={i === at ? colors.lime : '#D4E8D6'} style={{ flex: 1, textAlign: 'center' }}>{s}</T>)}
        </View>
      </View>
      <View style={{ gap: 10, alignSelf: 'flex-start', minWidth: 210 }}>
        <Button title="Davom ettirish" iconRight="arrow-right" onPress={onResume} />
        <HeroGhost icon="rotate-ccw" title="Boshidan boshlash" onPress={onRestart} />
      </View>
    </Hero>
  );
}

/** Bosh sahifadagi qator (Takrorlash, Xatolarim, Mustahkamlash): oq hoshiya ichida rangli fon, chiziqli ikonka va o'ngda strelka yoki kichik tugma. */
function Row({ icon, tint, accent, title, sub, action, label, onPress }: {
  icon: IconName; tint: string; accent: string; title: string; sub: string; action?: string; label: string; onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={({ pressed }) => ({ backgroundColor: colors.surface, borderRadius: 22, padding: 4, opacity: pressed ? 0.9 : 1 })}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, backgroundColor: tint, paddingVertical: 8, paddingLeft: 12, paddingRight: 10 }}>
        <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name={icon} size={20} color={accent} />
        </View>
        <View style={{ flex: 1 }}>
          <T w="extrabold" size={16} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{title}</T>
          <T size={13} color={colors.inkSoft} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>{sub}</T>
        </View>
        {action ? (
          <View style={{ height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: colors.surface, justifyContent: 'center' }}>
            <T w="extrabold" size={13} color={accent}>{action}</T>
          </View>
        ) : (
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="chevron-right" size={18} color={accent} />
          </View>
        )}
      </View>
    </Pressable>
  );
}
