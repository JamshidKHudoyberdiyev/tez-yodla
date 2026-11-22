import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Plant, RingsDecor } from '@/components/Art';
import { achievements, ArtGlyph, artBg, Avatar, AVATAR_ARTS, type Progress } from '@/components/Avatar';
import { Flame } from '@/components/Streak';
import { LEVELS, LevelLadder } from '@/components/Level';
import { BottomSheet, Button, RoundIconButton, Screen, T } from '@/components/ui';
import { pickAvatarPhoto, photoSupported } from '@/lib/avatarPhoto';
import { computeStats } from '@/lib/plan';
import { useStore } from '@/lib/store';
import { AVATAR_COLORS, colors, font } from '@/lib/theme';

/** Profil (v3): kim ekansiz va qancha o'sdingiz — daraja, maqsad, yutuqlar. Ism va avatar alohida varaqda tahrirlanadi. */
export default function Profile() {
  const { state, words, today, streak } = useStore();
  const [editing, setEditing] = useState(false);
  const p = state.prefs;
  const stats = computeStats(state.cards, state.log, today);
  const progress: Progress = { learned: stats.learned, mastered: stats.mastered, best: streak.best, custom: state.customWords.length };

  // Necha kundan beri: birinchi mashg'ulot kuni.
  const firstDay = useMemo(() => {
    const days = [...Object.keys(state.log).map(Number), ...state.doneDays].filter(Number.isFinite);
    return days.length ? Math.min(...days) : null;
  }, [state.log, state.doneDays]);
  const sinceDays = firstDay === null ? 0 : today - firstDay + 1;

  // Joriy daraja so'zlari: nechtasi o'rganilgan.
  const levelWords = useMemo(() => words.filter((w) => w.level === state.level), [words, state.level]);
  const levelLearned = levelWords.filter((w) => state.cards[w.id] && state.cards[w.id].state !== 'new').length;
  const levelIdx = Math.max(0, LEVELS.findIndex((l) => l.id === state.level));
  const nextLevel = LEVELS[levelIdx + 1];

  const ach = achievements(progress, streak);
  const doneCount = ach.filter((a) => a.done).length;

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <RoundIconButton icon="chevron-left" label="Orqaga" onPress={() => (router.canGoBack() ? router.back() : router.replace('/settings'))} />
        <T w="extrabold" size={22} style={{ flex: 1 }} accessibilityRole="header">Profil</T>
      </View>

      {/* Kim ekansiz */}
      <View style={{ backgroundColor: colors.forest, borderRadius: 32, padding: 20, gap: 16, overflow: 'hidden' }}>
        <View pointerEvents="none" style={{ position: 'absolute', right: -70, top: -70 }}><RingsDecor /></View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Avatarni o'zgartirish" onPress={() => setEditing(true)}>
            <Avatar name={state.name} color={p.avatarColor} art={p.avatarArt} photo={p.avatarPhoto} size={84} onDark />
            <View style={{ position: 'absolute', right: -6, bottom: -6, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.lime, borderWidth: 3, borderColor: colors.forestLine, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="edit-2" size={13} color={colors.forestDeep} />
            </View>
          </Pressable>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T w="extrabold" size={20} color="#FFFFFF" numberOfLines={2} style={{ lineHeight: 24 }}>{state.name || 'Ismingizni kiriting'}</T>
            <T size={13} color={colors.onForestSoft}>{state.level} · {LEVELS[levelIdx]?.name}</T>
            {sinceDays > 0 ? (
              <View style={{ flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 6, marginTop: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)' }}>
                <Feather name="calendar" size={12} color={colors.lime} />
                <T w="bold" size={12} color="#FFFFFF">{sinceDays} kundan beri o'rganyapti</T>
              </View>
            ) : null}
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <HeroStat icon={<Flame size={24} dim={!streak.todayDone} />} value={streak.current} label="kun streak" sub={streak.best > streak.current ? `rekord ${streak.best}` : undefined} />
          <HeroStat icon={<Plant stage={1} size={24} />} value={stats.learned} label="so'z o'rganildi" />
          <HeroStat icon={<Plant stage={5} size={24} />} value={stats.mastered} label="yodlangan" />
        </View>
      </View>

      {/* Daraja */}
      <View style={{ backgroundColor: colors.surface, borderRadius: 26, padding: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <T w="extrabold" size={16}>Darajangiz</T>
          <T w="bold" size={13} color={colors.forestText} accessibilityRole="button" onPress={() => router.push({ pathname: '/onboarding/test', params: { retake: '1' } })}>Qayta aniqlash · 3 daq</T>
        </View>
        <LevelLadder level={state.level} />
        {levelWords.length ? (
          <View style={{ gap: 6, paddingTop: 2 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <T size={13} color={colors.inkSoft}>{state.level} so'zlari</T>
              <T w="extrabold" size={13}>{levelLearned} / {levelWords.length}</T>
            </View>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.bg, overflow: 'hidden' }}>
              <View style={{ width: `${Math.round((levelLearned / levelWords.length) * 100)}%`, height: 8, borderRadius: 4, backgroundColor: colors.forest }} />
            </View>
            <T size={12} color={colors.muted}>
              {levelLearned >= levelWords.length ? `${state.level} so'zlari tugadi!${nextLevel ? ` Endi ${nextLevel.id} sari.` : ''}` : `Yana ${levelWords.length - levelLearned} ta so'z${nextLevel ? ` — keyin ${nextLevel.id}` : ''}`}
            </T>
          </View>
        ) : null}
      </View>

      {/* Yutuqlar */}
      <View style={{ backgroundColor: colors.surface, borderRadius: 26, padding: 16, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <T w="extrabold" size={16}>Yutuqlar</T>
          <T w="extrabold" size={13} color={colors.forestText}>{doneCount} / {ach.length}</T>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 }}>
          {ach.map((a) => (
            <View key={a.id} accessible accessibilityLabel={`${a.title}: ${a.done ? 'ochilgan' : `${Math.min(a.have, a.need)} / ${a.need}`}`} style={{ width: '33.33%', alignItems: 'center', gap: 4, paddingHorizontal: 2 }}>
              <View style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: a.done ? artBg(a.art) : colors.track, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ opacity: a.done ? 1 : 0.25 }}><ArtGlyph id={a.art} size={48} /></View>
                {!a.done ? (
                  <View style={{ position: 'absolute', right: -3, top: -3, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 }}>
                    <Feather name="lock" size={11} color={colors.muted} />
                  </View>
                ) : null}
              </View>
              <T w="extrabold" size={12} color={a.done ? colors.ink : colors.inkSoft} style={{ textAlign: 'center', lineHeight: 15 }}>{a.title}</T>
              {a.done ? <T size={10} color={colors.muted} style={{ textAlign: 'center' }}>{a.sub}</T> : (
                <>
                  <View style={{ width: 52, height: 4, borderRadius: 2, backgroundColor: colors.line, overflow: 'hidden' }}>
                    <View style={{ width: `${Math.round((Math.min(a.have, a.need) / a.need) * 100)}%`, height: 4, backgroundColor: colors.forest }} />
                  </View>
                  <T size={10} color={colors.muted}>{Math.min(a.have, a.need)} / {a.need}</T>
                </>
              )}
            </View>
          ))}
        </View>
      </View>

      <EditSheet visible={editing} onClose={() => setEditing(false)} progress={progress} />
    </Screen>
  );
}

function HeroStat({ icon, value, label, sub }: { icon: React.ReactNode; value: number; label: string; sub?: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2, paddingVertical: 10, paddingHorizontal: 4, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.2)' }}>
      {icon}
      <T w="extrabold" size={22} color="#FFFFFF" style={{ lineHeight: 26 }}>{value}</T>
      <T size={11} color={colors.onForestSoft} style={{ textAlign: 'center' }}>{label}</T>
      {sub ? <T w="bold" size={10} color={colors.lime}>{sub}</T> : null}
    </View>
  );
}

/** Tahrirlash varag'i: ism va avatar — bosh harflar (rang), bog' belgisi yoki o'z rasmi (galereya / kamera). */
type Tab = 'letters' | 'art' | 'photo';
const tabOf = (art: string | null): Tab => (art === 'photo' ? 'photo' : art ? 'art' : 'letters');

function EditSheet({ visible, onClose, progress }: { visible: boolean; onClose: () => void; progress: Progress }) {
  const { state, setName, setPrefs } = useStore();
  const canPhoto = useMemo(() => photoSupported(), []);
  const [name, setLocalName] = useState(state.name);
  const [color, setColor] = useState(state.prefs.avatarColor);
  const [art, setArt] = useState<string | null>(state.prefs.avatarArt === 'photo' ? null : state.prefs.avatarArt);
  const [photo, setPhoto] = useState<string | null>(state.prefs.avatarPhoto);
  const [tab, setTab] = useState<Tab>(tabOf(state.prefs.avatarArt));
  const [busy, setBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const reset = () => {
    setLocalName(state.name); setColor(state.prefs.avatarColor); setArt(state.prefs.avatarArt === 'photo' ? null : state.prefs.avatarArt);
    setPhoto(state.prefs.avatarPhoto); setTab(tabOf(state.prefs.avatarArt)); setPhotoError(null);
  };
  const close = () => { reset(); onClose(); };
  const previewArt = tab === 'art' ? art : tab === 'photo' && photo ? 'photo' : null;
  const save = () => {
    setName(name.trim());
    setPrefs({ avatarColor: color, avatarArt: previewArt, avatarPhoto: photo });
    onClose();
  };
  const dirty = name.trim() !== state.name || color !== state.prefs.avatarColor || previewArt !== state.prefs.avatarArt || photo !== state.prefs.avatarPhoto;

  const pick = async (source: 'library' | 'camera') => {
    setPhotoError(null);
    setBusy(true);
    const r = await pickAvatarPhoto(source);
    setBusy(false);
    if (r.ok) { setPhoto(r.uri); return; }
    if (r.reason === 'denied') setPhotoError('Kameraga ruxsat berilmadi. Telefon sozlamalaridan ruxsat bering.');
    else if (r.reason === 'error') setPhotoError('Rasmni ochib bo\'lmadi. Boshqa rasm tanlab ko\'ring.');
  };

  const tabs: [Tab, string][] = [['letters', 'Harflar'], ['art', "Bog' belgisi"], ...(canPhoto ? [['photo', 'Rasm'] as [Tab, string]] : [])];

  return (
    <BottomSheet visible={visible} onClose={close} contentStyle={{ paddingHorizontal: 20, paddingTop: 12, gap: 14 }}>
          <View style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Avatar name={name} color={color} art={previewArt} photo={photo} size={72} />
            <View style={{ flex: 1 }}>
              <T w="extrabold" size={20} accessibilityRole="header">Profilni tahrirlash</T>
              <T size={13} color={colors.muted}>Avatar va ism faqat sizga ko'rinadi</T>
            </View>
          </View>

          <View accessibilityRole="tablist" style={{ flexDirection: 'row', padding: 4, gap: 4, borderRadius: 14, backgroundColor: colors.surface }}>
            {tabs.map(([id, label]) => {
              const on = tab === id;
              return (
                <Pressable key={id} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => { setTab(id); if (id === 'art' && !art) setArt('plant1'); }}
                  style={{ flex: 1, height: 38, borderRadius: 10, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.forest : 'transparent' }}>
                  {id === 'photo' ? <Feather name="camera" size={14} color={on ? '#FFFFFF' : colors.inkSoft} /> : null}
                  <T w={on ? 'extrabold' : 'semibold'} size={13} color={on ? '#FFFFFF' : colors.inkSoft}>{label}</T>
                </Pressable>
              );
            })}
          </View>

          {tab === 'letters' ? (
            <View accessibilityRole="radiogroup" accessibilityLabel="Avatar rangi" style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
              {AVATAR_COLORS.map((c) => (
                <Pressable key={c} accessibilityRole="radio" accessibilityState={{ checked: c === color }} accessibilityLabel={`Rang ${c}`} onPress={() => setColor(c)}
                  style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: c, borderWidth: c === color ? 3 : 0, borderColor: colors.surface, transform: [{ scale: c === color ? 1.1 : 1 }] }} />
              ))}
            </View>
          ) : tab === 'art' ? (
            <>
              <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 10, marginHorizontal: -5 }}>
                {AVATAR_ARTS.map((a) => {
                  const lock = a.lock?.(progress) ?? null;
                  const on = art === a.id;
                  return (
                    <View key={a.id} style={{ width: '25%', paddingHorizontal: 5 }}>
                      <Pressable accessibilityRole="radio" accessibilityState={{ checked: on, disabled: !!lock }} accessibilityLabel={lock ? `${a.label}: ${lock} kerak` : a.label} disabled={!!lock} onPress={() => setArt(a.id)}
                        style={{ aspectRatio: 1, borderRadius: 20, backgroundColor: artBg(a.id), alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: on ? 3 : 0, borderColor: colors.forestLine }}>
                        <ArtGlyph id={a.id} size={52} />
                        {lock ? (
                          <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: colors.veil, alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 4 }}>
                            <Feather name="lock" size={13} color={colors.muted} />
                            <T w="extrabold" size={9} color={colors.muted} style={{ textAlign: 'center', lineHeight: 11 }}>{lock}</T>
                          </View>
                        ) : null}
                      </Pressable>
                    </View>
                  );
                })}
              </View>
              <T size={12} color={colors.muted}>Yangi belgilar yutuqlar bilan ochiladi.</T>
            </>
          ) : (
            <>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {([['library', 'image', 'Galereyadan'], ['camera', 'camera', 'Suratga olish']] as const).map(([src, icon, label]) => (
                  <Pressable key={src} accessibilityRole="button" accessibilityLabel={label} disabled={busy} onPress={() => pick(src)}
                    style={({ pressed }) => ({ flex: 1, height: 96, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', gap: 8, opacity: busy ? 0.6 : pressed ? 0.85 : 1 })}>
                    <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.limeSoft, alignItems: 'center', justifyContent: 'center' }}>
                      <Feather name={icon} size={20} color={colors.forestText} />
                    </View>
                    <T w="extrabold" size={14}>{label}</T>
                  </Pressable>
                ))}
              </View>
              {photoError ? (
                <View accessibilityRole="alert" style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: colors.wrongSoft, borderWidth: 2, borderColor: colors.wrong, borderRadius: 16, padding: 12 }}>
                  <Feather name="alert-triangle" size={18} color={colors.wrong} />
                  <T size={13} color={colors.ink} style={{ flex: 1, lineHeight: 18 }}>{photoError}</T>
                </View>
              ) : (
                <T size={12} color={colors.muted} style={{ lineHeight: 18 }}>Rasm kvadrat qilib qirqiladi. Hisobingizda saqlanadi — boshqa telefonda ham chiqadi.</T>
              )}
            </>
          )}

          <View style={{ gap: 6 }}>
            <T w="bold" size={13} color={colors.inkSoft}>Ismingiz</T>
            <TextInput value={name} onChangeText={setLocalName} placeholder="Masalan, Jamshid" placeholderTextColor={colors.placeholder} accessibilityLabel="Ismingiz" maxLength={30}
              style={{ height: 52, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, fontFamily: font.bold, fontSize: 17, color: colors.ink }} />
          </View>
          <Button title="Saqlash" disabled={!dirty || (tab === 'photo' && !photo)} onPress={save} />
    </BottomSheet>
  );
}
