# Tez Yodla — loyiha holati va ish qoidalari (HANDOFF)

> Bu fayl yangi sessiya/yangi Claude hisobi uchun. Har sessiya boshida to'liq o'qing.
> Oxirgi yangilanish: 2026-11-22.

## 1. Kim va nima

- **Egasi:** Jamshid Xudoyberdiyev (Toshkent, UTC+5). Ilova — o'zbek tilida so'zlashuvchilar uchun ingliz so'zlarini
  yodlash ilovasi **«Tez Yodla»** (Expo / React Native, Android birinchi).
- Claude bu loyihada **dasturchi, dizayner va PM** vazifasini bajaradi.
- Kontentni (so'zlar, talaffuz) o'qituvchilar bilan tekshirib boriladi.

## 2. Ish qoidalari (QAT'IY)

1. **Har doim o'zbek tilida javob ber.** Qisqa, aniq, ortiqcha gapsiz.
2. **Avval dizayn → «ha» → keyin kod.** Har qanday yangi ekran/o'zgarish avval HOZIRGI ilova uslubida chiziladi,
   Jamshid «ha» demaguncha kod yozilmaydi. Yangi uslub o'ylab topilmaydi (v4/v5 «yangi uslub» chizmalari rad etilgan).
3. **Qora tugma yo'q.** Asosiy tugma — laym (lime), ikkinchi darajali — oq. Xato holati — **qizil chegara/panel**.
4. Har ishdan keyin aniq ayt: **OTA yetadimi yoki yangi build kerakmi** (native modul qo'shilsa — yangi build).
5. **Kunlik o'qish budjeti 15–20 daqiqa** (ilova shunga mo'ljallangan).
6. Jamshid oddiy savol bersa — qisqa javob ber, ortiqcha tekshiruv/ish boshlama.
7. Sirlar (kalitlar, parollar) chatga yozilmaydi; `.env` faqat kompyuterda, git'ga tushmaydi.
8. git commit/push va `eas update`ni odatda Jamshid o'zi qiladi — buyruqlarni aniq yozib ber.

## 3. Texnik tuzilma

- **Stack:** Expo SDK 58, RN 0.88, Expo Router (`src/app/`), TypeScript, AsyncStorage (`yodla:v1`), jest
  (`src/lib/**/*.test.ts`, `@/` alias). Shrift: Manrope. Ranglar: forest (to'q yashil) + lime, iliq och fon.
- **EAS:** project `0b7e664e-ba54-46bd-a55f-18f271724cdf`, owner `jamshidxudoyberdiyev`, package `uz.tezyodla.app`.
  Profillar: `preview` (APK, kanal preview), `production` (AAB). `runtimeVersion.policy = appVersion` (1.0.0).
  OTA: `npx eas-cli update --channel preview --environment preview -m "..."`.
  ⚠️ appVersion siyosati sabab OTA eski build'ga ham tushadi → native modulsiz build'da ilova yiqiladi
  (22-noyabrda `ExpoAudio` xatosi shundan). Play build'dan oldin `fingerprint` siyosatiga o'tish rejalashtirilgan.
- **Build'lar:** oxirgisi commit 8483c76 (expo-audio bor), 19-noyabr. Telefonda shu build turishi kerak.
- **SRS (`src/lib/srs.ts`, `docs/ALGORITHM.md`):** INTERVALS [1,3,7,14,30], MASTERED 90; ease 0.6–1.3
  (good +0.1, easy +0.15, hard −0.15, again −0.2); `retentionFactor` 0.85 (esda qolish <80%, ≥20 namuna).
  Takrorlash zinapoyasi (`reviewModeFor`): 0 teskari, 1 gap ichida/yozish, 2 yozish, 3 eshitib topish, 4 yozish,
  mastered — teskari. Yangi so'z guruhi: Tanishish → Eslash → Test → Moslash → Yozish → Matn.
- **Kontent:** `content/*.tsv` → `node scripts/content-to-ts.mjs` → `src/data/generated`. Tekshiruv: `npx jest content`.
  Qoidalar: `content/README.md`. ~1461 ta noyob so'z. 52 ta so'z turli to'plamda turli tarjima bilan
  (`scripts/duplicate-translations.json`) — hal qilinmagan.
- **Hisob va bulut:** Google Sign-In (faqat Google, yangi foydalanuvchiga majburiy) + Supabase
  (project `kkhxlxxfdyyqkgpvsuyc`, jadval `progress`, RLS). Kod: `src/lib/supabase.ts`, `auth.tsx`, `cloud.ts`.
  Google OAuth hozir **Testing** holatida — faqat test foydalanuvchilar (jamshidnocode@gmail.com) kira oladi.
- **Ovozlar (`src/lib/audioService.ts`, `speech.ts`):**
  - Har so'z MP3: `assets/audio/us|uk|uz/<slug>.mp3` (Azure: en-US-AvaNeural, en-GB-SoniaNeural, uz-UZ-MadinaNeural;
    24 kHz, 64 kbps, ~-16 LUFS). Skriptlar: `gen-audio-en.py`, `gen-audio-uz.py` (oʻ/gʻ/tutuq normalizatsiyasi),
    `audio_quality.py`, `verify-audio.py` (Azure STT bilan tekshiruv → `audio-check.csv`).
  - OTA cheklovi (≤1000 fayl/platforma) sabab ilova **jamlangan** fayllarni ishlatadi:
    `assets/audio/pack-us.mp3`, `pack-uk.mp3` + `src/data/generated/audio.ts` (slug → [boshi, oxiri] ms).
    Yasash: `python scripts/gen-audio-pack.py` (ffmpeg kerak). Pleyer so'z joyiga siljiydi va oxirida to'xtaydi.
  - Lug'atda yo'q so'z/gaplar → telefon TTS (expo-speech). O'zbekcha ovoz hali ilovaga ulanmagan (quloqchin rejimi uchun).
  - ⚠️ **Azure F0 (bepul) tarifida yaratilgan — faqat sinov uchun.** O'qituvchilar ma'qul ko'rsa: S0 ga o'tib
    hammasini qayta yaratish, keyin OTA (`docs/RELEASE.md` → «Ovozlar: Azure S0»). Production'ga F0 ovoz bilan chiqilmaydi.
    Azure resurs: `tez-yodla-speech`, North Europe, F0. Kalit `.env`da (AZURE_SPEECH_KEY, AZURE_SPEECH_REGION=northeurope).
- **Boshqa:** Sentry (`.env` EXPO_PUBLIC_SENTRY_DSN), eslatmalar (`reminders.ts`), kechki mustahkamlash
  (`evening.tsx`), xatolarim, o'yinlar, bog' (so'z bosqichlari o'simlik ko'rinishida).

## 4. Nima qilingan (oxirgi ishlar)

- So'z yodlashni mustahkamlash: kechki tekshiruv, so'z yo'li, shaxsiy oraliqlar, esda qolish %.
- 13 ta mavzu to'plami (Gemini/Antigravity bilan kontent quvuri).
- Google bilan kirish + progress Supabase'da (commit 0b1b20e).
- Tabiiy ovoz (8483c76), ovozni bitta faylga jamlash (567b792).
- **Mashg'ulotni davom ettirish** (`src/lib/draft.ts`, bosh sahifada «To'xtatilgan mashg'ulot») va
  **eshitib moslash** (Moslashda chapda faqat 🔊, hammasi topilgach o'zi o'tadi) — e83ec5f.
- O'zbekcha ovoz (2f17775). Azure inglizcha ovozlar + 64 kbps (22-noyabr).

## 5. Ochiq ishlar (ustuvorlik tartibida)

1. **O'qituvchi tekshiruvi:** 53 ta shubhali inglizcha so'z (qisqa so'zlar: bed, hat, thin, heart…) —
   o'qituvchi raqamlarini yuboradi → faqat o'shalarni sekinroq qayta yaratish.
2. **Play Market tayyorgarligi:**
   - Google OAuth'ni **Production** holatiga o'tkazish (aks holda testerlar kira olmaydi).
   - **Hisobni o'chirish** (ilova ichida + veb) — Play talabi.
   - Maxfiylik siyosati sahifasi; Data safety, yosh reytingi anketalari.
   - Play App Signing SHA-1 ni Google OAuth Android client'ga qo'shish.
   - `runtimeVersion` → `fingerprint`; production build (AAB).
   - Shaxsiy Play hisob (2023-11-13 dan keyin) bo'lsa: **12+ tester × 14 kun yopiq sinov** — erta boshlash kerak.
   - Azure S0 bilan ovozlarni qayta yaratish (5-band yuqorida).
3. **Rejalashtirilgan, keyinga qoldirilgan:**
   - Quloqchin rejimi (dizayn tayyor: «Quloqchin rejimi» sahifasi). Ekran o'chiq ijro uchun yangi build kerak.
   - Bosh sahifa redizayni (ikki «Boshlash» → bitta, markaziy «+» deyarli qora, «Matndan» noaniq).
   - 52 ta bir xil so'z / turli ma'no muammosi.
   - Mastered so'zlar har 3 oyda umrbod so'raladimi yoki cheklanadimi — Jamshid hali hal qilmagan.
   - Diktant, kameradan so'z olish (OCR), talaffuzni yozib olib solishtirish.

## 6. Dizayn

- Barcha dizayn eski Claude hisobidagi «Tez Yodla ilova dizayni» canvas'ida (sahifalar: v1…v4, Streak, Sozlamalar,
  Moslash, Yozish, To'plamlar, Xatolarim, Matn, Bosh sahifa, Takrorlash chegarasi, Mustahkamlash, Tabiiy ovoz,
  Kirish, Qulayliklar, Quloqchin rejimi).
- **Eksport: `docs/design/README.md`** — 24 sahifa, 166 ekran rasmi (`umumiy/*.jpg` — sahifa bo'yicha umumiy ko'rinish,
  `ekranlar/<sahifa>/*.png` — har ekran alohida), holati (tarixiy / ilovada bor / reja) bilan. Yangi dizayn — faqat shu uslubda.

## 7. Foydali buyruqlar

```bash
npm install                      # kutubxonalar
npx expo start                   # dev server (shuningdek .expo/types yangilanadi)
npx tsc --noEmit -p .            # tiplar
npx jest                         # testlar (139+)
npx eas-cli update --channel preview --environment preview -m "..."   # OTA
npx eas-cli build -p android --profile preview                         # yangi APK
python scripts/gen-audio-pack.py # ovozlarni jamlash (ffmpeg)
```
